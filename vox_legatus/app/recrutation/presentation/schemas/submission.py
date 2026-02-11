from typing import Optional
from pydantic import BaseModel

from app.recrutation.presentation.schemas.grade import GradeRead


class SubmissionCreate(BaseModel):
    submission_number: str
    about_me: Optional[str]
    subject_1: Optional[str]
    subject_2: Optional[str]
    subject_1_answer: Optional[str]
    subject_2_answer: Optional[str]

class SubmissionRead(BaseModel):
    id: int
    group_id: Optional[int]
    submission_number: str
    about_me: str
    subject_1: str
    subject_2: str
    subject_1_answer: str
    subject_2_answer: str

class SubmissionGradeRequest(BaseModel):
    grade: float

class SubmissionGraderRead(BaseModel):
    id: int
    about_me: str
    subject_1: str
    subject_2: str
    subject_1_answer: str
    subject_2_answer: str
    already_graded: bool

class SubmissionGradedRead(BaseModel):
    submission: SubmissionRead
    grades: list[GradeRead]
    avg: float