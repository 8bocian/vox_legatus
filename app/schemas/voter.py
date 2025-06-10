from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.schemas.user import UserRead


class VoterBase(BaseModel):
    pass

    class Config:
        orm_mode = True


class VoterCreate(VoterBase):
    poll_id: int
    user_id: int


class VoterUpdate(VoterBase):
    voted_at: datetime



class VoterRead(VoterBase):
    id: int
    poll_id: int
    user_id: int
    created_at: datetime
    voted_at: Optional[datetime]

    class Config:
        from_attributes = True

class VoterUserRead(VoterRead):
    user: Optional[UserRead]
