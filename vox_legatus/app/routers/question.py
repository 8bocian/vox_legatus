from fastapi import APIRouter, Path, Depends, Body, Query, HTTPException
from typing import Annotated, List
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db
from app.models import User
from app.schemas.question import QuestionUpdate, QuestionRead, QuestionCreate, QuestionCreateInput
from app.crud import question as question_crud

router = APIRouter()


@router.get("/{question_id}", response_model=QuestionRead)
async def get_question(
        question_id: Annotated[int, Path()],
        session: Annotated[AsyncSession, Depends(get_db)],
        jwt_user: Annotated[User, Depends(get_current_user)]
):
    question = (await question_crud.get_question(session, question_id))

    if not question:
        raise HTTPException(status_code=404, detail="Poll not found")

    if question.creator_id != jwt_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this poll")

    return question


