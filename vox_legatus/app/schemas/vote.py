from typing import List, Union

from pydantic import BaseModel
from datetime import datetime


class VoteBase(BaseModel):
    question_id: int
    answer_id: int

    class Config:
        orm_mode = True


class VoteCreateInput(VoteBase):
    answer_id: Union[int, List[int]]


class VoteCreate(VoteBase):
    poll_id: int
    voter_id: int


class VoteRead(VoteBase):
    id: int
    poll_id: int
    voter_id: int
    created_at: datetime

    class Config:
        from_attributes = True
