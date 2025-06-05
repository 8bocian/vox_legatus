from pydantic import BaseModel
from app.enums import QuestionType
from datetime import datetime


class QuestionBase(BaseModel):
    poll_id: int
    creator_id: int
    type: QuestionType
    choices_number: int
    content: str

    class Config:
        orm_mode = True


class QuestionCreate(QuestionBase):
    pass


class QuestionRead(QuestionBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
