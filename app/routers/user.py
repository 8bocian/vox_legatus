from fastapi import APIRouter, Path, Depends, Body, Query, HTTPException
from typing import Annotated, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.auth import require_role, get_current_user, hash_password
from app.database import get_db
from app.enums import Role
from app.models import User
from app.schemas.user import UserCreate, UserRead, UserUpdate
from app.crud import user as user_crud

router = APIRouter()


@router.get("/{user_id}", response_model=UserRead)
async def get_user(
        user_id: Annotated[int, Path()],
        session: Annotated[AsyncSession, Depends(get_db)],
        admin: User = Depends(require_role(Role.ADMIN))
):
    user = (await user_crud.get_user(session, user_id))

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return user


@router.get("/", response_model=List[UserRead])
async def get_users(
        session: Annotated[AsyncSession, Depends(get_db)],
        admin: User = Depends(require_role(Role.ADMIN)),
        size: Annotated[int, Query(ge=1, le=100)] = 100,
        offset: Annotated[int, Query(ge=0)] = 0,
        email: Annotated[Optional[str], Query()] = None
):
    print(email)
    users = (await user_crud.get_users(session, email=email, size=size, offset=offset))
    # print(users[0].email)
    return users


@router.post("/", response_model=UserRead)
async def create_user(
        user: Annotated[UserCreate, Body()],
        session: Annotated[AsyncSession, Depends(get_db)],
        admin: User = Depends(require_role(Role.ADMIN))
):
    exisitng_user = (await user_crud.get_user(session, email=user.email))

    if exisitng_user:
        raise HTTPException(status_code=404, detail="User exists")

    user.password = hash_password(user.password)
    new_user = (await user_crud.create_user(session, user))
    return new_user


@router.put("/{user_id}", response_model=UserRead)
async def update_user(
        user_id: Annotated[int, Path()],
        user: Annotated[UserUpdate, Body()],
        session: Annotated[AsyncSession, Depends(get_db)],
        admin: User = Depends(require_role(Role.ADMIN))
):
    user_to_change = (await user_crud.get_user(session, user_id))

    if not user_to_change:
        raise HTTPException(status_code=404, detail="User not found")

    updated_poll = (await user_crud.update_user(session, user_id, user))
    return updated_poll
