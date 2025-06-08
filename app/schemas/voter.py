from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class VoterBase(BaseModel):
    poll_id: int
    user_id: int

    class Config:
        orm_mode = True


class VoterCreate(VoterBase):
    pass


class VoterUpdate(VoterBase):
    voted_at: Optional[datetime]


class VoterRead(VoterBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
