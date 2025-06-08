from typing import Optional

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
