from sqlalchemy import desc, ScalarResult
from typing import List, Type, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Answer
from app.schemas.answer import AnswerCreate, AnswerUpdate
from sqlalchemy.future import select


async def get_answers(db: AsyncSession, creator_id: int, size: int, offset: int) -> List[Answer]:
    query = select(Answer)

    query = (
        query
        .where(Answer.creator_id == creator_id)
        .offset(offset)
        .limit(size)
    )
    result: ScalarResult[Answer] = await db.scalars(query)
    return list(result.all())


async def get_answer(db: AsyncSession, answer_id: int) -> Optional[Answer]:
    return (await db.scalar(select(Answer).where(Answer.id == answer_id)))


async def get_answers_by_question_id(db: AsyncSession, question_id: int) -> List[Answer]:
    result = await db.execute(select(Answer).where(Answer.question_id == question_id))
    return result.scalars().all()


async def create_answer(db: AsyncSession, answer: AnswerCreate) -> Answer:
    new_answer = Answer(
        creator_id=answer.creator_id,
        poll_id=answer.poll_id,
        question_id=answer.question_id,
        content=answer.content
    )

    db.add(new_answer)
    await db.commit()
    await db.refresh(new_answer)
    return new_answer


async def update_answer(db: AsyncSession, answer_id: int, answer: AnswerUpdate) -> Optional[Answer]:
    db_answer = (await get_answer(db, answer_id))

    if not db_answer:
        return None

    for field, value in answer.model_dump(exclude_unset=True).items():
        setattr(db_answer, field, value)

    await db.commit()
    await db.refresh(db_answer)
    return db_answer
