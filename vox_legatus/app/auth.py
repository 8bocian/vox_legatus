from datetime import timedelta, datetime
from typing import Annotated, Optional
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session
import jwt
from app.database import get_db
from app.enums import Role
from app.models import User
from app.config import JWT_SECRET_KEY, JWT_TTL, JWT_ALGORITHM
from fastapi.responses import RedirectResponse
from starlette.requests import Request
import app.crud.user as user_crud

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login")
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=JWT_TTL))
    to_encode.update({"exp": expire})
    token = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return token


def decode_access_token(token: str):
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise Exception("Token expired")
    except jwt.InvalidTokenError:
        raise Exception("Invalid token")


async def get_current_user(
        request: Request,
        db: AsyncSession = Depends(get_db)
) -> User:
    token = request.cookies.get("access_token")

    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        payload = decode_access_token(token)
        user_id = int(payload.get("sub"))
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid authentication")

    user = (await user_crud.get_user(db, user_id))
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return user


async def get_current_user_html(
        request: Request,
        db: Annotated[AsyncSession, Depends(get_db)],
):
    token = request.cookies.get("access_token")

    if not token:
        return RedirectResponse("/login", status_code=302)

    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        user_id = int(payload.get("sub"))
    except Exception:
        return RedirectResponse("/login", status_code=302)

    user = (await user_crud.get_user(db, user_id))

    if not user:
        return RedirectResponse("/login", status_code=302)

    return user


def require_role_html(required_role: Role):
    def role_checker(current_user: User = Depends(get_current_user_html)):
        if current_user.role != required_role:
            return RedirectResponse("/login", status_code=302)
        return current_user
    return role_checker

def require_role(required_role: Role):
    def role_checker(current_user: User = Depends(get_current_user)):
        print(current_user.role, required_role)
        if current_user.role != required_role:
            raise HTTPException(status_code=403, detail="Not authorized")
        return current_user
    return role_checker

