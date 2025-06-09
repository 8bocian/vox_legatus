from datetime import datetime
from typing import Optional

from pydantic import BaseModel


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

    class Config:
        from_attributes = True
