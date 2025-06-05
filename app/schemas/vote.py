from pydantic import BaseModel
from datetime import datetime


class VoteBase(BaseModel):
    poll_id: int
    voter_id: int
    question_id: int
    answer_id: int

    class Config:
        orm_mode = True


class VoteCreate(VoteBase):
    pass


class VoteRead(VoteBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
