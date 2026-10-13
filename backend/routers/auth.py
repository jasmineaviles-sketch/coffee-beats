"""Staff login / logout / whoami. Session lives in an httpOnly cookie."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response

from lib.auth import COOKIE, SESSION_DAYS, cookie_secure, create_session, current_user, verify_password
from lib.db import db
from models.schemas import LoginIn, Me, Message

router = APIRouter(prefix="/auth")


@router.post("/login", response_model=Me)
async def login(body: LoginIn, response: Response):
    user = await db.users.find_one({"username": body.username.strip()})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    if body.portal == "admin":
        if user["role"] != "admin":
            raise HTTPException(status_code=403, detail="This account cannot access the admin dashboard")
        if not body.accept_terms:
            raise HTTPException(status_code=400, detail="You must accept the Terms and Conditions")
        await db.users.update_one({"_id": user["_id"]}, {"$set": {"terms_accepted_at": datetime.now(timezone.utc)}})
    token = await create_session(user)
    response.set_cookie(COOKIE, token, httponly=True, samesite="lax", secure=cookie_secure(),
                        max_age=SESSION_DAYS * 86400, path="/")
    return Me(username=user["username"], role=user["role"])


@router.get("/me", response_model=Me)
async def me(user: dict = Depends(current_user)):
    return Me(**user)


@router.post("/logout", response_model=Message)
async def logout(request: Request, response: Response):
    token = request.cookies.get(COOKIE)
    if token:
        await db.sessions.delete_one({"token": token})
    response.delete_cookie(COOKIE, path="/")
    return Message(message="Signed out")
