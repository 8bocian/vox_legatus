from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr
from app.enums import Role


class UserBase(BaseModel):
    name: str
    surname: str
    email: EmailStr
    role: Role

    class Config:
        orm_mode = True


class UserCreate(UserBase):
    password: str


class UserUpdate(UserBase):
    password: Optional[str] = None
    name: Optional[str] = None
    surname: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[Role] = None


class UserRead(UserBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
