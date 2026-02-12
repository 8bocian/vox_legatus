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
    id: int
    submission_id: int
    submission_number: str
    grade_id: int
    current_grade: float
    new_grade: float
    status: TicketStatus
