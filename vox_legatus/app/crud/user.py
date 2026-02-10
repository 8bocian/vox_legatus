from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models import User
from app.schemas.user import UserCreate, UserUpdate
from app.enums.role import Role
from typing import List, Optional
from sqlalchemy.engine import ScalarResult


async def get_users(db: AsyncSession, email: Optional[str], size: int, offset: int) -> List[User]:
    query = select(User)
    print(email)
    if email is not None:
        query = query.where(User.email.ilike(f"%{email}%"))

    query = (
        query
        .offset(offset)
        .limit(size)
    )
    result: ScalarResult[User] = (await db.scalars(query))

    return list(result.all())


async def get_user(db: AsyncSession, user_id: Optional[int] = None, email: Optional[str] = None) -> Optional[User]:
    query = select(User)

    if user_id is not None:
        query = query.where(User.id == user_id)
    if email is not None:
        query = query.where(User.email == email)

    if user_id is None and email is None:
        return None

    return (await db.scalar(query))

async def get_users_by_role(db: AsyncSession, roles: list[Role]):
    query = select(User)
    print(roles)
    query = query.where(User.role.in_(roles))


    result: ScalarResult[User] = (await db.scalars(query))

    return list(result.all())


async def create_user(db: AsyncSession, user: UserCreate):
    new_user = User(
        name=user.name,
        surname=user.surname,
        email=user.email,
        password=user.password,
        role=user.role,
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    return new_user


async def update_user(db: AsyncSession, user_id: int, user: UserUpdate) -> Optional[User]:
    db_user = (await get_user(db, user_id))

    if not db_user:
        return None

    for field, value in user.model_dump(exclude_unset=True).items():
        setattr(db_user, field, value)

    await db.commit()
    await db.refresh(db_user)
    return db_user


async def delete_user(session: AsyncSession, user_id: int) -> Optional[User]:
    user = await session.get(User, user_id)
    if not user:
        return None

    await session.delete(user)
    await session.commit()
    return user