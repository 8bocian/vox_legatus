from sqlalchemy import desc, ScalarResult
from typing import List, Type, Optional
from sqlalchemy.ext.asyncio import AsyncSession
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

async def get_voters_by_poll_id(db: AsyncSession, poll_id: int, size: int, offset: int) -> List[Voter]:
    query = select(Voter)
    print(poll_id)
    query = (
        query
        .where(Voter.poll_id == poll_id)
        .offset(offset)
        .limit(size)
    )
    result: ScalarResult[Voter] = await db.scalars(query)
    return list(result.all())


async def get_voter(db: AsyncSession, voter_id: int) -> Optional[Voter]:
    return (await db.scalar(select(Voter).where(Voter.id == voter_id)))


async def create_voter(db: AsyncSession, voter: VoterCreate) -> Voter:
    new_voter = Voter(
        poll_id=voter.poll_id,
        user_id=voter.user_id
    )

    db.add(new_voter)
    await db.commit()
    await db.refresh(new_voter)
    return new_voter
