from sqlalchemy import desc, ScalarResult
from typing import List, Type, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Question
from app.schemas.question import QuestionCreate, QuestionUpdate
from sqlalchemy.future import select


async def get_questions(db: AsyncSession, creator_id: int, size: int, offset: int) -> List[Question]:
    query = select(Question)

    query = (
        query
        .where(Question.creator_id == creator_id)
        .offset(offset)
        .limit(size)
    )
    result: ScalarResult[Question] = await db.scalars(query)
    return list(result.all())


async def get_question(db: AsyncSession, question_id: int) -> Optional[Question]:
    return (await db.scalar(select(Question).where(Question.id == question_id)))


async def get_questions_by_poll_id(db: AsyncSession, poll_id: int) -> List[Question]:
    result = await db.execute(select(Question).where(Question.poll_id == poll_id))
    return result.scalars().all()


async def create_question(db: AsyncSession, question: QuestionCreate) -> Question:
    new_question = Question(
        creator_id=question.creator_id,
        poll_id=question.poll_id,
        type=question.type,
        choices_number=question.choices_number,
        content=question.content
    )

    db.add(new_question)
    await db.commit()
    await db.refresh(new_question)
    return new_question


async def update_question(db: AsyncSession, question_id: int, question: QuestionUpdate) -> Optional[Question]:
    db_question = (await get_question(db, question_id))

    if not db_question:
        return None
    print(question.model_dump(exclude_unset=True).items())
    for field, value in question.model_dump(exclude_unset=True).items():
        print(field, value)
        setattr(db_question, field, value)

    await db.commit()
    await db.refresh(db_question)
    return db_question


async def delete_question(session: AsyncSession, question_id: int):
    question = await session.get(Question, question_id)
    if not question:
        return None

    await session.delete(question)
    await session.commit()
    return question