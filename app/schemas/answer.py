from typing import Optional, Union

from pydantic import BaseModel
from datetime import datetime


class AnswerBase(BaseModel):
    content: Optional[str] = None

    class Config:
        orm_mode = True


class AnswerCreate(AnswerBase):
    poll_id: int
    question_id: int
    creator_id: int


class AnswerCreateInput(AnswerBase):
    pass


class AnswerUpdate(AnswerBase):
    pass

class AnswerUpdateInput(AnswerBase):
    pass


class AnswerRead(AnswerBase):
    poll_id: int
    question_id: int
    creator_id: int
    id: int
    created_at: datetime

class AnswerStats(BaseModel):
    answer_id: int
    answer_content: Optional[str]
    votes_count: int