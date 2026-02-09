from pydantic import BaseModel


class CreateGraderRequest(BaseModel):
    user_id: int