import hashlib
import hmac
import os
import uuid
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Header, HTTPException

from config import settings
from database import fetchone

ALGORITHM = "HS256"
PBKDF2_ITERATIONS = 100_000


def new_id() -> str:
    return uuid.uuid4().hex


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt, PBKDF2_ITERATIONS
    )
    return f"pbkdf2_sha256${PBKDF2_ITERATIONS}${salt.hex()}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        _, iterations, salt_hex, digest_hex = stored.split("$")
        digest = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            bytes.fromhex(salt_hex),
            int(iterations),
        )
        return hmac.compare_digest(digest.hex(), digest_hex)
    except (ValueError, TypeError):
        return False


def create_token(user_id: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "iat": now,
        "exp": now + timedelta(minutes=settings.jwt_expires_minutes),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    return jwt.decode(token, settings.jwt_secret, algorithms=[ALGORITHM])


def _extract_token(authorization: str) -> str | None:
    if not authorization.startswith("Bearer "):
        return None
    return authorization.removeprefix("Bearer ").strip()


def get_current_user(authorization: str = Header(default="")) -> dict:
    token = _extract_token(authorization)
    if not token:
        raise HTTPException(status_code=401, detail="Missing or invalid token.")
    try:
        payload = decode_token(token)
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")
    user = fetchone(
        "SELECT id, email FROM users WHERE id = ?", (payload.get("sub"),)
    )
    if not user:
        raise HTTPException(status_code=401, detail="User not found.")
    return user


def get_optional_user(authorization: str = Header(default="")) -> dict | None:
    """Like get_current_user but returns None when not authenticated."""
    token = _extract_token(authorization)
    if not token:
        return None
    try:
        payload = decode_token(token)
    except jwt.PyJWTError:
        return None
    return fetchone("SELECT id FROM users WHERE id = ?", (payload.get("sub"),))
