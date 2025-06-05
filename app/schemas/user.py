from datetime import datetime
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
    pass


class UserRead(UserBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
