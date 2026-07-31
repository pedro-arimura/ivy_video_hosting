import shutil
from pathlib import Path

from config import settings

try:
    import boto3
    from botocore.exceptions import ClientError

    HAS_BOTO3 = True
except ImportError:
    HAS_BOTO3 = False

CHUNK_SIZE = 64 * 1024


class RangeNotSatisfiable(Exception):
    pass


def parse_range(range_header: str | None, size: int) -> tuple[int, int] | None:
    """Parse a 'bytes=...' Range header into (start, end) inclusive offsets."""
    if not range_header or not range_header.startswith("bytes="):
        return None
    try:
        spec = range_header[6:].strip()
        start_str, _, end_str = spec.partition("-")
        if start_str == "":
            start = max(size - int(end_str), 0)
            end = size - 1
        else:
            start = int(start_str)
            end = int(end_str) if end_str else size - 1
    except ValueError:
        raise RangeNotSatisfiable()
    if start < 0 or start >= size or start > end:
        raise RangeNotSatisfiable()
    return start, min(end, size - 1)


def _range_headers(status: int, size: int, rng: tuple[int, int] | None) -> dict:
    headers = {"Accept-Ranges": "bytes"}
    if rng:
        start, end = rng
        headers["Content-Length"] = str(end - start + 1)
        headers["Content-Range"] = f"bytes {start}-{end}/{size}"
    else:
        headers["Content-Length"] = str(size)
    return headers


def _file_chunks(path: Path, start: int, end: int):
    remaining = end - start + 1
    with open(path, "rb") as f:
        f.seek(start)
        while remaining > 0:
            chunk = f.read(min(CHUNK_SIZE, remaining))
            if not chunk:
                break
            remaining -= len(chunk)
            yield chunk


class LocalStorage:
    """Stores files on the local disk (used for local dev / fallback)."""

    def save(self, key: str, file_obj, content_type: str) -> None:
        dest = settings.files_dir / key
        dest.parent.mkdir(parents=True, exist_ok=True)
        with open(dest, "wb") as f:
            shutil.copyfileobj(file_obj, f)

    def delete(self, key: str) -> None:
        path = settings.files_dir / key
        if path.exists():
            path.unlink()

    def stream(self, key: str, range_header: str | None):
        path = settings.files_dir / key
        if not path.exists():
            return None
        size = path.stat().st_size
        try:
            rng = parse_range(range_header, size)
        except RangeNotSatisfiable:
            return {
                "status": 416,
                "headers": {"Content-Range": f"bytes */{size}"},
                "body": [],
            }
        if rng is None:
            start, end, status = 0, size - 1, 200
        else:
            start, end = rng
            status = 206
        headers = _range_headers(status, size, rng)
        return {
            "status": status,
            "headers": headers,
            "body": _file_chunks(path, start, end),
        }


class S3Storage:
    """Stores files on any S3-compatible service (R2, B2, MinIO, AWS...)."""

    def __init__(self) -> None:
        self.client = boto3.client(
            "s3",
            endpoint_url=settings.s3_endpoint_url,
            aws_access_key_id=settings.s3_access_key,
            aws_secret_access_key=settings.s3_secret_key,
            region_name=settings.s3_region,
        )
        self.bucket = settings.s3_bucket

    def save(self, key: str, file_obj, content_type: str) -> None:
        self.client.upload_fileobj(
            file_obj,
            self.bucket,
            key,
            ExtraArgs={"ContentType": content_type},
        )

    def delete(self, key: str) -> None:
        try:
            self.client.delete_object(Bucket=self.bucket, Key=key)
        except ClientError:
            pass

    def stream(self, key: str, range_header: str | None):
        try:
            head = self.client.head_object(Bucket=self.bucket, Key=key)
        except ClientError:
            return None
        size = int(head["ContentLength"])
        try:
            rng = parse_range(range_header, size)
        except RangeNotSatisfiable:
            return {
                "status": 416,
                "headers": {"Content-Range": f"bytes */{size}"},
                "body": [],
            }
        get_kwargs = {}
        if rng:
            get_kwargs["Range"] = f"bytes={rng[0]}-{rng[1]}"
        try:
            obj = self.client.get_object(
                Bucket=self.bucket, Key=key, **get_kwargs
            )
        except ClientError:
            return None
        status = 206 if rng else 200
        headers = _range_headers(status, size, rng)
        headers["Content-Type"] = head.get("ContentType") or "video/mp4"
        return {"status": status, "headers": headers, "body": obj["Body"]}


def get_storage():
    if settings.use_s3:
        if not HAS_BOTO3:
            raise RuntimeError("boto3 is required when using S3 storage.")
        return S3Storage()
    return LocalStorage()
