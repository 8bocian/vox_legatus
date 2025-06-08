from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.enums import Role
from app.schemas.user import UserCreate, UserRead
from app.schemas.auth import LoginRequest, TokenResponse
from app.models import User
from app.crud import user as user_crud
from app.auth import hash_password, verify_password, create_access_token, require_role
from app.database import get_db
from sqlalchemy.future import select

router = APIRouter()


@router.post("/register", response_model=UserRead)
async def register_user(
        new_user: UserCreate,
        session: AsyncSession = Depends(get_db),
        admin: User = Depends(require_role(Role.ADMIN))
):
    existing_user = (await user_crud.get_user(session, email=new_user.email))

    if existing_user:
        raise HTTPException(status_code=400, detail="Username or email already exists")
    new_user.password = hash_password(new_user.password)
    new_user = (await user_crud.create_user(session, new_user))

    return new_user


@router.post("/login", response_model=TokenResponse)
async def login(
        login: LoginRequest,
        session: AsyncSession = Depends(get_db)
):
    user = (await user_crud.get_user(session, email=login.email))
    if not user or not verify_password(login.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"sub": str(user.id)})
    response = JSONResponse(content={"message": "Logged in"})
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=False,  # use True in production with HTTPS
        samesite="lax"
    )
    return response

