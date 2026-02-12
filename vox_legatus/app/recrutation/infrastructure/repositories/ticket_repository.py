from typing import Sequence, Optional

from sqlalchemy import select, or_, func, and_, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.recrutation.presentation.schemas.ticket import TicketCreate, TicketStatus
from app.recrutation.infrastructure.models.ticket import TicketModel


class TicketRepo:
    async def create(self, session: AsyncSession, create_ticket: TicketCreate):
        ticket = TicketModel(
            grade_id=create_ticket.grade_id,
            new_grade=create_ticket.new_grade,
            explanation=create_ticket.explanation
        )
        session.add(ticket)
        await session.flush()
        return ticket.id

    async def get_all(self, session: AsyncSession, search: Optional[str]=None) -> Sequence[TicketModel]:
        stmt = select(TicketModel)

        tickets_results = await session.execute(stmt)
        tickets = tickets_results.scalars().all()
        return tickets

    async def get(self, session: AsyncSession, ticket_id: int) -> Optional[TicketModel]:
        ticket = await session.get(TicketModel, ticket_id)
        return ticket

    async def change_status(self, session: AsyncSession, ticket_id: int, status: TicketStatus):
        ticket = await session.get(TicketModel, ticket_id)
        ticket.status = status
