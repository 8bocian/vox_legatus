from datetime import datetime

from sqlalchemy import desc, ScalarResult, update
from typing import List, Type, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload, joinedload

from app.models import Voter
from app.schemas.voter import VoterCreate, VoterRead
from sqlalchemy.future import select


async def get_voters(db: AsyncSession, user_id: int, size: int, offset: int) -> List[Voter]:
    query = select(Voter)

    query = (
        query
        .where(Voter.user_id == user_id)
        .offset(offset)
        .limit(size)
    )
    result: ScalarResult[Voter] = await db.scalars(query)
    return list(result.all())


async def get_voters_by_poll_id_and_user_id(db: AsyncSession, poll_id: int, user_id: int) -> Voter:
    query = (
        select(Voter)
        .where(Voter.poll_id == poll_id)
        .where(Voter.user_id == user_id)
    )
    return (await db.scalar(query))


async def get_voters_by_poll_id(db: AsyncSession, poll_id: int, size: int, offset: int) -> List[Voter]:
    query = (
        select(Voter)
        .options(selectinload(Voter.user))  # 👈 To dołącza dane użytkownika
        .where(Voter.poll_id == poll_id)
        .offset(offset)
        .limit(size)
    )
    result: ScalarResult[Voter] = await db.scalars(query)
    return list(result.all())


async def get_voter(db: AsyncSession, voter_id: int) -> Optional[Voter]:
    return (await db.scalar(select(Voter).where(Voter.id == voter_id)))


async def create_voter(db: AsyncSession, voter: VoterCreate) -> Voter:
    new_voter = Voter(poll_id=voter.poll_id, user_id=voter.user_id)
    db.add(new_voter)
    await db.commit()

    result = await db.execute(
        select(Voter).options(joinedload(Voter.user)).where(Voter.id == new_voter.id)
    )
    voter_with_user = result.scalar_one()
    return voter_with_user


async def delete_voter(session: AsyncSession, voter_id: int) -> None:
    result = await session.execute(select(Voter).where(Voter.id == voter_id))
    voter = result.scalar_one_or_none()
    if voter is None:
        raise ValueError(f"Voter with id {voter_id} not found")

    await session.delete(voter)
    await session.commit()


async def update_voter_voted_at(session: AsyncSession, voter_id: int):
    stmt = (
        update(Voter)
        .where(Voter.id == voter_id)
        .values(voted_at=datetime.now())
        .execution_options(synchronize_session="fetch")
    )
    await session.execute(stmt)
    await session.commit()