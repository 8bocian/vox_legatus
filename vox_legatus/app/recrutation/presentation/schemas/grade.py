from pydantic import BaseModel


class GradeRead(BaseModel):
    grade_id: int
    grader_id: int
    username: str
    grade: float