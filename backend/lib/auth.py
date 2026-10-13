"""Password hashing + cookie sessions for admin / cashier staff."""

import hashlib
import hmac
import os
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, Request

from lib.db import db

COOKIE = "cb_session"
SESSION_DAYS = 7


def hash_password(password: str, salt: str | None = None) -> str:
    salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 120_000).hex()
    return f"{salt}${digest}"


def verify_password(password: str, stored: str) -> bool:
    try:
        salt, _ = stored.split("$", 1)
    except ValueError:
        return False
    return hmac.compare_digest(hash_password(password, salt), stored)


async def create_session(user: dict) -> str:
    token = secrets.token_urlsafe(32)
    await db.sessions.insert_one({
        "token": token,
        "username": user["username"],
        "role": user["role"],
        "expires_at": datetime.now(timezone.utc) + timedelta(days=SESSION_DAYS),
    })
    return token


def cookie_secure() -> bool:
    return os.environ.get("COOKIE_SECURE", "false").lower() == "true"


async def current_user(request: Request) -> dict:
    token = request.cookies.get(COOKIE)
    if not token:
        raise HTTPException(status_code=401, detail="Not signed in")
    sess = await db.sessions.find_one({"token": token})
    if not sess or sess["expires_at"] < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    return {"username": sess["username"], "role": sess["role"]}


async def require_admin(user: dict = Depends(current_user)) -> dict:
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return user


async def require_staff(user: dict = Depends(current_user)) -> dict:
    if user["role"] not in ("admin", "cashier"):
        raise HTTPException(status_code=403, detail="Staff only")
    return user
