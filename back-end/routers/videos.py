import os
import re
from pathlib import Path

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    Header,
    HTTPException,
    Response,
    UploadFile,
)
from fastapi.responses import StreamingResponse

from auth import get_current_user, get_optional_user, new_id
from database import execute, fetchall, fetchone, to_iso
from storage import get_storage

router = APIRouter()

MAX_UPLOAD_MB = int(os.getenv("MAX_UPLOAD_MB", "500"))


def _sanitize_filename(name: str) -> str:
    name = Path(name or "video").name
    return re.sub(r"[^A-Za-z0-9._-]", "_", name) or "video.mp4"


def _serialize_video(row: dict) -> dict:
    return {
        "id": row["id"],
        "title": row["title"],
        "description": row["description"],
        "filename": row["filename"],
        "size_bytes": row["size_bytes"],
        "content_type": row["content_type"],
        "created_at": to_iso(row["created_at"]),
        "owner": {
            "id": row["owner_id"],
            "email": row.get("owner_email") or "",
        },
    }


def _get_video_row(video_id: str) -> dict:
    row = fetchone(
        "SELECT v.*, u.email AS owner_email FROM videos v "
        "JOIN users u ON u.id = v.owner_id WHERE v.id = ?",
        (video_id,),
    )
    if not row:
        raise HTTPException(status_code=404, detail="Video not found.")
    return row


@router.post("/upload", status_code=201)
def upload_video(
    title: str = Form(...),
    description: str = Form(""),
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    title = title.strip()
    if not title:
        raise HTTPException(status_code=422, detail="Title is required.")

    size = file.size
    file_obj = file.file
    if size is None:
        file_obj.seek(0, 2)
        size = file_obj.tell()
        file_obj.seek(0)
    if size > MAX_UPLOAD_MB * 1024 * 1024:
        raise HTTPException(
            status_code=413, detail=f"File exceeds the {MAX_UPLOAD_MB} MB limit."
        )

    storage = get_storage()
    video_id = new_id()
    safe_name = _sanitize_filename(file.filename or "video.mp4")
    key = f"videos/{video_id}/{safe_name}"
    content_type = file.content_type or "video/mp4"

    try:
        storage.save(key, file_obj, content_type)
    except Exception as exc:
        raise HTTPException(
            status_code=502, detail="Failed to store the uploaded file."
        ) from exc

    execute(
        "INSERT INTO videos "
        "(id, owner_id, title, description, filename, size_bytes, content_type, storage_key) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (
            video_id,
            user["id"],
            title,
            description,
            safe_name,
            size,
            content_type,
            key,
        ),
    )
    return _serialize_video(_get_video_row(video_id))


@router.get("")
def list_videos(user: dict | None = Depends(get_optional_user)):
    rows = fetchall(
        "SELECT v.*, u.email AS owner_email FROM videos v "
        "JOIN users u ON u.id = v.owner_id "
        "ORDER BY v.created_at DESC"
    )
    videos = [_serialize_video(row) for row in rows]
    if user:
        for video in videos:
            video["is_mine"] = video["owner"]["id"] == user["id"]
    return {"videos": videos}


@router.get("/{video_id}")
def get_video(video_id: str):
    return _serialize_video(_get_video_row(video_id))


@router.get("/{video_id}/stream")
def stream_video(
    video_id: str,
    range_header: str | None = Header(default=None, alias="Range"),
):
    row = _get_video_row(video_id)
    result = get_storage().stream(row["storage_key"], range_header)
    if result is None:
        raise HTTPException(status_code=404, detail="Video file not found.")
    headers = dict(result["headers"])
    headers["Content-Type"] = row["content_type"]
    return StreamingResponse(
        result["body"],
        status_code=result["status"],
        headers=headers,
        media_type=row["content_type"],
    )


@router.delete("/{video_id}", status_code=204)
def delete_video(video_id: str, user: dict = Depends(get_current_user)):
    row = fetchone("SELECT owner_id, storage_key FROM videos WHERE id = ?", (video_id,))
    if not row:
        raise HTTPException(status_code=404, detail="Video not found.")
    if row["owner_id"] != user["id"]:
        raise HTTPException(
            status_code=403, detail="You can only delete your own videos."
        )
    get_storage().delete(row["storage_key"])
    execute("DELETE FROM videos WHERE id = ?", (video_id,))
    return Response(status_code=204)
