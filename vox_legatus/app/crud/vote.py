from sqlalchemy import desc, ScalarResult
from typing import List, Type, Optional, Union
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.models import Vote
from app.schemas.vote import VoteCreate, VoteRead
from sqlalchemy.future import select


async def get_votes(db: AsyncSession, voter_id: int, size: int, offset: int) -> List[Vote]:
    query = select(Vote)

    query = (
        query
        .where(Vote.voter_id == voter_id)
        .offset(offset)
        .limit(size)
    )
    result: ScalarResult[Vote] = await db.scalars(query)
    return list(result.all())

async def get_poll_votes(db: AsyncSession, poll_id: int, size: int, offset: int) -> List[Vote]:
    query = select(Vote)

    query = (
        query
        .where(Vote.poll_id == poll_id)
        .offset(offset)
        .limit(size)
    )
    result: ScalarResult[Vote] = await db.scalars(query)
    return list(result.all())


async def get_question_votes(db: AsyncSession, question_id: int, size: int, offset: int) -> List[Vote]:
    query = select(Vote)

    query = (
        query
        .where(Vote.question_id == question_id)
        .offset(offset)
        .limit(size)
    )
    result: ScalarResult[Vote] = await db.scalars(query)
    return list(result.all())



async def get_vote(db: AsyncSession, vote_id: int) -> Optional[Vote]:
    return (await db.scalar(select(Vote).where(Vote.id == vote_id)))


async def create_vote(db: AsyncSession, vote: Union[VoteCreate, List[VoteCreate]]) -> Vote:
    if isinstance(vote, list):
        new_votes = [
            Vote(
                poll_id=vote_.poll_id,
                voter_id=vote_.voter_id,
                question_id=vote_.question_id,
                answer_id=vote_.answer_id
            ) for vote_ in vote
        ]
        db.add_all(new_votes)
    else:
        new_vote = Vote(
            poll_id=vote.poll_id,
            voter_id=vote.voter_id,
            question_id=vote.question_id,
            answer_id=vote.answer_id
        )

        db.add(new_vote)
    await db.commit()
    return True


async def delete_vote(session: AsyncSession, vote_id: int) -> None:
    result = await session.execute(select(Vote).where(Vote.id == vote_id))
    vote = result.scalar_one_or_none()
    if vote is None:
        raise ValueError(f"Vote with id {vote_id} not found")

    await session.delete(vote)
    await session.commit()

