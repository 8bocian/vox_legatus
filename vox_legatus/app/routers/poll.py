from fastapi import APIRouter, Path, Depends, Body, Query, HTTPException
from typing import Annotated, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.auth import require_role, get_current_user
from app.database import get_db
from app.enums import Role
from app.models import User, Voter
from app.schemas.answer import AnswerCreate, AnswerRead, AnswerCreateInput, AnswerUpdateInput, AnswerUpdate
from app.schemas.poll import PollCreate, PollRead, PollUpdate, PollCreateInput, PollReadFull, PollUpdateInput
from app.crud import poll as poll_crud
from app.crud import question as question_crud
from app.crud import answer as answer_crud
from app.crud import voter as voter_crud
from app.crud import vote as vote_crud

from app.schemas.question import QuestionCreate, QuestionReadFull, QuestionRead, QuestionCreateInput, \
    QuestionUpdateInput, QuestionUpdate
from app.schemas.vote import VoteCreateInput, VoteCreate
from app.schemas.voter import VoterCreate, VoterRead, VoterUserRead

router = APIRouter()


@router.get("/{poll_id}", response_model=PollReadFull)
async def get_poll(
        poll_id: Annotated[int, Path()],
        session: Annotated[AsyncSession, Depends(get_db)],
        jwt_user: Annotated[User, Depends(get_current_user)]
):
    poll = (await poll_crud.get_poll(session, poll_id))

    if not poll:
        raise HTTPException(status_code=404, detail="Poll not found")

    print(poll.id)
    questions = (await question_crud.get_questions_by_poll_id(session, poll.id))
    full_questions = []
    if questions:
        for question in questions:
            answers = (await answer_crud.get_answers_by_question_id(session, question.id))
            full_question = QuestionReadFull(
                creator_id=question.creator_id,
                poll_id=question.poll_id,
                created_at=question.created_at,
                type=question.type,
                id=question.id,
                choices_number=question.choices_number,
                content=question.content,
                answers=[
                    AnswerRead(
                        poll_id=answer.poll_id,
                        question_id=answer.question_id,
                        creator_id=answer.creator_id,
                        content=answer.content,
                        id=answer.id,
                        created_at=answer.created_at
                    ) for answer in answers
                ]
            )
            full_questions.append(full_question)
    full_poll = PollReadFull(
        id=poll.id,
        creator_id=poll.creator_id,
        created_at=poll.created_at,
        title=poll.title,
        description=poll.description,
        status=poll.status,
        opened_at=poll.opened_at,
        closed_at=poll.closed_at,
        questions=full_questions
    )

    return full_poll


@router.get("", response_model=List[PollRead])
async def get_polls(
        session: Annotated[AsyncSession, Depends(get_db)],
        jwt_user: Annotated[User, Depends(get_current_user)],
        votersonly: Annotated[bool, Query()] = False,
        size: Annotated[int, Query(ge=1, le=100)] = 100,
        offset: Annotated[int, Query(ge=0)] = 0,
        creator_id: Annotated[Optional[int], Query()] = None,
        title: Annotated[Optional[str], Query()] = None
):

    polls = (await poll_crud.get_polls(session, size=size, offset=offset, creator_id=creator_id, title=title))
    voter_polls = []
    for poll in polls:
        voter = (await voter_crud.get_voters_by_poll_id_and_user_id(session, poll_id=poll.id, user_id=jwt_user.id))
        if votersonly:
            if voter is None:
                continue
        voter_poll = PollRead(
            id=poll.id,
            title=poll.title,
            description=poll.description,
            status=poll.status,
            opened_at=poll.opened_at,
            closed_at=poll.closed_at,
            creator_id=poll.creator_id,
            created_at=poll.created_at,
            voter=voter
        )
        voter_polls.append(voter_poll)
    return voter_polls




@router.post("", response_model=PollRead)
async def create_poll(
        poll: Annotated[PollCreateInput, Body()],
        session: Annotated[AsyncSession, Depends(get_db)],
        admin: User = Depends(require_role(Role.ADMIN))
):
    poll = PollCreate(**poll.model_dump(exclude_unset=True), creator_id=admin.id)
    new_poll = (await poll_crud.create_poll(session, poll))

    return new_poll


@router.put("/{poll_id}", response_model=PollRead)
async def update_poll(
        poll_id: Annotated[int, Path()],
        poll: Annotated[PollUpdateInput, Body()],
        session: Annotated[AsyncSession, Depends(get_db)],
        jwt_user: Annotated[User, Depends(get_current_user)]
):
    poll_to_change = (await poll_crud.get_poll(session, poll_id))

    if not poll_to_change:
        raise HTTPException(status_code=404, detail="Poll not found")

    poll = PollUpdate(**poll.model_dump(exclude_unset=True))

    updated_poll = (await poll_crud.update_poll(session, poll_id, poll))
    return updated_poll


@router.delete("/{poll_id}", response_model=PollRead)
async def delete_poll(
        poll_id: Annotated[int, Path()],
        session: Annotated[AsyncSession, Depends(get_db)],
        admin: Annotated[User, Depends(require_role(Role.ADMIN))]
):
    poll = (await poll_crud.delete_poll(session, poll_id))
    if not poll:
        raise HTTPException(status_code=404, detail="Poll not found")
    return poll


@router.delete("/{poll_id}/question/{question_id}", response_model=PollRead)
async def delete_poll_question(
        poll_id: Annotated[int, Path()],
        question_id: Annotated[int, Path()],
        session: Annotated[AsyncSession, Depends(get_db)]
):
    question = (await question_crud.delete_question(session, question_id))
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    return question

@router.get("/{poll_id}/question/{question_id}", response_model=QuestionRead)
async def get_question(
        poll_id: Annotated[int, Path()],
        question_id: Annotated[int, Path()],
        session: Annotated[AsyncSession, Depends(get_db)],
        admin: Annotated[User, Depends(require_role(Role.ADMIN))]
):
    question = (await question_crud.get_question(session, question_id))

    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    return question


@router.post("/{poll_id}/question", response_model=QuestionRead)
async def create_question(
        poll_id: Annotated[int, Path()],
        question: Annotated[QuestionCreateInput, Body()],
        session: Annotated[AsyncSession, Depends(get_db)],
        admin: Annotated[User, Depends(require_role(Role.ADMIN))]
):
    question = QuestionCreate(**question.model_dump(exclude_unset=True), creator_id=admin.id, poll_id=poll_id)
    new_question = (await question_crud.create_question(session, question))

    return new_question


@router.put("/{poll_id}/question/{question_id}", response_model=PollRead)
async def update_question(
        poll_id: Annotated[int, Path()],
        question_id: Annotated[int, Path()],
        question: Annotated[QuestionUpdateInput, Body()],
        session: Annotated[AsyncSession, Depends(get_db)],
        admin: Annotated[User, Depends(require_role(Role.ADMIN))]
):
    question_to_change = (await question_crud.get_question(session, question_id))

    if not question_to_change:
        raise HTTPException(status_code=404, detail="Question not found")

    question = QuestionUpdate(**question.model_dump(exclude_unset=True))

    updated_question = (await question_crud.update_question(session, question_id, question))
    return updated_question

@router.post("/{poll_id}/question/{question_id}/answer", response_model=QuestionRead)
async def create_answer(
        poll_id: Annotated[int, Path()],
        question_id: Annotated[int, Path()],
        question: Annotated[AnswerCreateInput, Body()],
        session: Annotated[AsyncSession, Depends(get_db)],
        jwt_user: Annotated[User, Depends(get_current_user)]
):
    answer = AnswerCreate(**question.model_dump(exclude_unset=True), creator_id=jwt_user.id, poll_id=poll_id, question_id=question_id)
    new_answer = (await answer_crud.create_answer(session, answer))

    return new_answer


@router.put("/{poll_id}/question/{question_id}/answer/{answer_id}", response_model=PollRead)
async def update_answer(
        poll_id: Annotated[int, Path()],
        question_id: Annotated[int, Path()],
        answer_id: Annotated[int, Path()],
        answer: Annotated[AnswerUpdateInput, Body()],
        session: Annotated[AsyncSession, Depends(get_db)],
        admin: Annotated[User, Depends(require_role(Role.ADMIN))]
):
    answer_to_change = (await answer_crud.get_answer(session, answer_id))

    if not answer_to_change:
        raise HTTPException(status_code=404, detail="Answer not found")

    answer = AnswerUpdate(**answer.model_dump(exclude_unset=True))

    updated_answer = (await answer_crud.update_answer(session, answer_id, answer))
    return updated_answer


@router.delete("/{poll_id}/question/{question_id}/answer/{answer_id}")
async def delete_answer(
        poll_id: Annotated[int, Path()],
        question_id: Annotated[int, Path()],
        answer_id: Annotated[int, Path()],
        session: Annotated[AsyncSession, Depends(get_db)],
        admin: Annotated[User, Depends(require_role(Role.ADMIN))]
):
    answer = (await answer_crud.delete_answer(session, answer_id))
    if not answer:
        raise HTTPException(status_code=404, detail="Answer not found")
    return answer


@router.post("/{poll_id}/user/{user_id}", response_model=VoterUserRead)
async def create_voter(
        poll_id: Annotated[int, Path()],
        user_id: Annotated[int, Path()],
        jwt_user: Annotated[User, Depends(get_current_user)],
        session: Annotated[AsyncSession, Depends(get_db)]

):
    voter = VoterCreate(user_id=user_id, poll_id=poll_id)
    voter = await voter_crud.create_voter(session, voter)
    return voter


@router.get("/{poll_id}/voters", response_model=List[VoterUserRead])
async def get_voters(
        poll_id: Annotated[int, Path()],
        jwt_user: Annotated[User, Depends(get_current_user)],
        session: Annotated[AsyncSession, Depends(get_db)]

):
    voters = (await voter_crud.get_voters_by_poll_id(session, poll_id, offset=0, size=1000))
    print(voters)
    return voters


@router.post("/{poll_id}/vote")
async def create_votes(
        poll_id: Annotated[int, Path()],
        votes: Annotated[List[VoteCreateInput], Body()],
        session: Annotated[AsyncSession, Depends(get_db)],
        jwt_user: Annotated[User, Depends(get_current_user)]
):
    if not len(votes):
        raise HTTPException(status_code=400, detail="Brak danych z odpowiedziami")
    voter = (await voter_crud.get_voters_by_poll_id_and_user_id(session, poll_id=poll_id, user_id=jwt_user.id))

    vote_creates: List[VoteCreate] = []

    for vote in votes:
        for answer_id in vote.answer_id:
            vote_creates.append(VoteCreate(
                answer_id=answer_id,
                question_id=vote.question_id,
                poll_id=poll_id,
                voter_id=voter.id
            ))

    await vote_crud.create_vote(session, vote_creates)

    await voter_crud.update_voter_voted_at(session, voter.id)

    return True


@router.get("/{poll_id}/results")
async def get_votes(
        poll_id: Annotated[int, Path()],
        session: Annotated[AsyncSession, Depends(get_db)],
        jwt_user: Annotated[User, Depends(get_current_user)]
):
    poll = (await poll_crud.get_poll(session, poll_id))
    if not poll:
        raise HTTPException(status_code=404, detail="Poll not found")
    return await poll_crud.get_poll_with_stats(session, poll_id)

