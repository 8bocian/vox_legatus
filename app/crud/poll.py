from sqlalchemy import desc, ScalarResult
from typing import List, Type, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.models import Poll, Voter
from app.schemas.poll import PollCreate, PollUpdate
from sqlalchemy.future import select


async def get_polls(db: AsyncSession, creator_id: Optional[int], title: Optional[str], size: int, offset: int) -> List[Poll]:
    query = select(Poll)
    if creator_id is not None:
        query = query.where(Poll.creator_id == creator_id)

    if title is not None:
        query = query.where(Poll.title.ilike(f"%{title}%"))

    query = query.offset(offset).limit(size)

    result: ScalarResult[Poll] = await db.scalars(query)
    return list(result.all())


async def get_polls_by_user(session: AsyncSession, user_id: int) -> List[Poll]:
    result = await session.execute(
        select(Poll)
        .join(Voter, Poll.id == Voter.poll_id)
        .where(Voter.user_id == user_id)
        .options(joinedload(Poll.questions))  # Optional: load related questions
    )
    return list(result.unique().scalars().all())


async def get_poll(db: AsyncSession, poll_id: int) -> Optional[Poll]:
    return (await db.scalar(select(Poll).where(Poll.id == poll_id)))


async def create_poll(db: AsyncSession, poll: PollCreate) -> Poll:
    new_poll = Poll(
        title=poll.title,
        description=poll.description,
        status=poll.status,
        creator_id=poll.creator_id,
        opened_at=poll.opened_at,
        closed_at=poll.closed_at
    )
    db.add(new_poll)
    await db.commit()
    await db.refresh(new_poll)
    return new_poll


async def update_poll(db: AsyncSession, poll_id: int, poll: PollUpdate) -> Optional[Poll]:
    db_poll = (await get_poll(db, poll_id))

    if not db_poll:
        return None

    for field, value in poll.model_dump(exclude_unset=True).items():
        setattr(db_poll, field, value)

    await db.commit()
    await db.refresh(db_poll)
    return db_poll


async def delete_poll(session: AsyncSession, poll_id: int):
    poll = await session.get(Poll, poll_id)
    if not poll:
        return None

    await session.delete(poll)
    await session.commit()
    return poll