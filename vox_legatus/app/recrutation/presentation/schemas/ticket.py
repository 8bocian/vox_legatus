from enum import Enum

from pydantic import BaseModel


class TicketStatus(Enum):
    WAITING = "Waiting"
    APPROVED = "Approved"
    CANCELED = "Canceled"


class TicketCreate(BaseModel):
    grade_id: int
    new_grade: float
    explanation: str


class TicketRead(BaseModel):
    ticket_id: int
    submission_id: int
    submission_number: str
    grade_id: int
    previous_grade: float
    proposed_grade: float
    status: TicketStatus
    requester_name: str
    explanation: str
