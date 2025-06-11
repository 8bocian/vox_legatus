from typing import Optional, List

from pydantic import BaseModel
from app.enums import QuestionType
from datetime import datetime

from app.schemas.answer import AnswerCreateInput, AnswerRead, AnswerStats


class QuestionBase(BaseModel):
    type: Optional[QuestionType] = None
    choices_number: Optional[int] = None
    content: Optional[str] = None

    class Config:
        orm_mode = True


class QuestionCreate(QuestionBase):
    poll_id: int
    creator_id: int


class QuestionCreateInput(QuestionBase):
    pass


class QuestionUpdate(QuestionBase):
    pass

class QuestionUpdateInput(QuestionBase):
    pass


class QuestionRead(QuestionBase):
    id: int
    poll_id: int
    creator_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class QuestionReadFull(QuestionRead):
    answers: List[AnswerRead]

class QuestionStats(BaseModel):
    question_id: int
    question_content: Optional[str]
    answers: List[AnswerStats]