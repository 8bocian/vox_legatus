from pydantic import BaseModel
from datetime import datetime


class AnswerBase(BaseModel):
    poll_id: int
    question_id: int
    creator_id: int
    content: str

    class Config:
        orm_mode = True


class AnswerCreate(AnswerBase):
    pass


class AnswerRead(AnswerBase):
    id: int
    created_at: datetime
