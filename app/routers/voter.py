from fastapi import APIRouter, Path, Depends, Body, Query, HTTPException
from typing import Annotated, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.auth import require_role, get_current_user
from app.database import get_db
from app.enums import Role
from app.models import User
from app.schemas.answer import AnswerCreate, AnswerRead, AnswerCreateInput, AnswerUpdateInput, AnswerUpdate
from app.schemas.poll import PollCreate, PollRead, PollUpdate, PollCreateInput, PollReadFull, PollUpdateInput
from app.crud import voter as voter_crud
from app.crud import poll as poll_crud

router = APIRouter()


@router.get("/user/polls", response_model=List[PollRead])
async def get_polls_for_user(
        jwt_user: Annotated[User, Depends(get_current_user)],
        session: Annotated[AsyncSession, Depends(get_db)]
):
    polls = await poll_crud.get_polls_by_user(session, jwt_user.id)
    return polls


@router.get("/{voter_id}", response_model=PollRead)
async def get_polls_for_user(
        voter_id: Annotated[int, Path()],
        jwt_user: Annotated[User, Depends(get_current_user)],
        session: Annotated[AsyncSession, Depends(get_db)]

):
    voter = await voter_crud.delete_voter(session, voter_id)
    return voter
