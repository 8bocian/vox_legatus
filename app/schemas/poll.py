from typing import Optional, List

from pydantic import BaseModel
from app.enums import PollStatus
from datetime import datetime
from app.schemas.question import QuestionCreateInput, QuestionReadFull
from app.schemas.voter import VoterRead


class PollBase(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[PollStatus] = None
    opened_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None

    class Config:
        orm_mode = True


class PollCreate(PollBase):
    creator_id: int


class PollCreateInput(PollBase):
    pass


class PollUpdate(PollBase):
    pass


class PollUpdateInput(PollBase):
    pass


class PollRead(PollBase):
    id: int
    creator_id: int
    created_at: datetime
    voter: Optional[VoterRead]

    class Config:
        from_attributes = True


class PollReadFull(PollBase):
    id: int
    creator_id: int
    created_at: datetime
    questions: List[QuestionReadFull]

    class Config:
        from_attributes = True
