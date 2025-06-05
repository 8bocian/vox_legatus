from pydantic import BaseModel
from app.enums import PollStatus
from datetime import datetime


class PollBase(BaseModel):
    title: str
    status: PollStatus
    opened_at: datetime
    closed_at: datetime

    class Config:
        orm_mode = True


class PollCreate(PollBase):
    creator_id: int



class PollUpdate(PollBase):
    pass


class PollRead(PollBase):
    id: int
    creator_id: int
    created_at: datetime

    class Config:
        from_attributes = True
