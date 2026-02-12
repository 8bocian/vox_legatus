from typing import Annotated, Optional, Sequence

from fastapi import APIRouter, Depends, Query, Body, Path
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import require_role
from app.database import get_db
from app.enums.role import Role
from app.models.user import User

from app.recrutation.infrastructure.repositories.ticket_repository import TicketRepo
from app.recrutation.presentation.schemas.ticket import TicketRead
from app.recrutation.infrastructure.repositories.submission_repository import SubmissionRepo

from app.recrutation.presentation.schemas.ticket import TicketStatus

from app.recrutation.infrastructure.repositories.grade_repository import GradeRepo
from app.recrutation.presentation.schemas.ticket import TicketCreate

router = APIRouter()

@router.get("")
async def get_all(
        admin: Annotated[User, Depends(require_role(Role.ADMIN))],
        session: Annotated[AsyncSession, Depends(get_db)],
        ticket_repo: Annotated[TicketRepo, Depends()],
        submission_repo: Annotated[SubmissionRepo, Depends()],
        grade_repo: Annotated[GradeRepo, Depends()]
) -> Sequence[TicketRead]:
    tickets = await ticket_repo.get_all(session)
    real_tickets: list[TicketRead] = []
    for ticket in tickets:
        grade = await grade_repo.get(session, ticket.grade_id)
        submission = await submission_repo.get(session, grade.submission_id)
        real_ticket = TicketRead(
            id=ticket.id,
            submission_id=submission.id,
            submission_number=submission.submission_number,
            grade_id=ticket.grade_id,
            current_grade=grade.grade,
            new_grade=ticket.new_grade,
            status=ticket.status,
        )
        real_tickets.append(real_ticket)
    return real_tickets

@router.post("/{ticket_id}/cancel")
async def cancel(
        admin: Annotated[User, Depends(require_role(Role.ADMIN))],
        session: Annotated[AsyncSession, Depends(get_db)],
        ticket_repo: Annotated[TicketRepo, Depends()],
        ticket_id: Annotated[int, Path()]
):
    await ticket_repo.change_status(session, ticket_id, TicketStatus.CANCELED)
    return

@router.post("/{ticket_id}/approve")
async def approve(
        admin: Annotated[User, Depends(require_role(Role.ADMIN))],
        session: Annotated[AsyncSession, Depends(get_db)],
        ticket_repo: Annotated[TicketRepo, Depends()],
        grade_repo: Annotated[GradeRepo, Depends()],
        ticket_id: Annotated[int, Path()]
):
    await ticket_repo.change_status(session, ticket_id, TicketStatus.APPROVED)
    ticket = await ticket_repo.get(session, ticket_id)
    await grade_repo.change_grade(session, ticket.grade_id, ticket.new_grade)
    return

@router.post("")
async def create(
        admin: Annotated[User, Depends(require_role(Role.GRADER))],
        session: Annotated[AsyncSession, Depends(get_db)],
        ticket_repo: Annotated[TicketRepo, Depends()],
        ticket_create: Annotated[TicketCreate, Body()]
):
    await ticket_repo.create(session, ticket_create)
    return

