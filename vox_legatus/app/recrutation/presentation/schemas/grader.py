from pydantic import BaseModel


class CreateGraderRequest(BaseModel):
    user_id: int

class GraderRead(BaseModel):
    grader_id: int
    user_id: int