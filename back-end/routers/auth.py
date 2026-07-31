import re

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth import create_token, get_current_user, hash_password, new_id, verify_password
from database import execute, fetchone

router = APIRouter()

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class SignupRequest(BaseModel):
    email: str
    password: str


class SigninRequest(BaseModel):
    email: str
    password: str


def _auth_response(user: dict) -> dict:
    return {
        "token": create_token(user["id"]),
        "user": {"id": user["id"], "email": user["email"]},
    }


@router.post("/signup", status_code=201)
def signup(body: SignupRequest):
    email = body.email.strip().lower()
    if not EMAIL_RE.match(email):
        raise HTTPException(status_code=422, detail="Invalid email address.")
    if len(body.password) < 6:
        raise HTTPException(
            status_code=422, detail="Password must be at least 6 characters."
        )
    if fetchone("SELECT id FROM users WHERE email = ?", (email,)):
        raise HTTPException(
            status_code=409, detail="An account with this email already exists."
        )
    user_id = new_id()
    execute(
        "INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)",
        (user_id, email, hash_password(body.password)),
    )
    return _auth_response({"id": user_id, "email": email})


@router.post("/signin")
def signin(body: SigninRequest):
    email = body.email.strip().lower()
    user = fetchone("SELECT * FROM users WHERE email = ?", (email,))
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    return _auth_response(user)


@router.get("/me")
def me(user: dict = Depends(get_current_user)):
    return {"user": {"id": user["id"], "email": user["email"]}}
