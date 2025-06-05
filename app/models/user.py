from sqlalchemy import Column, String, Integer, DateTime, func, Enum as SqlEnum
from app.database import Base
from app.enums import Role


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    surname = Column(String, nullable=False)
    email = Column(String, index=True, nullable=False)
    role = Column(SqlEnum(Role), default=Role.USER, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
