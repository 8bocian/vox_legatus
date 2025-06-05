from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, func, Enum as SqlEnum
from app.database import Base
from app.enums import QuestionType


class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True, nullable=False)
    creator_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    poll_id = Column(Integer, ForeignKey("polls.id"), index=True, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    type = Column(SqlEnum(QuestionType), nullable=False)
    choices_number = Column(Integer, nullable=True)
    content = Column(String, nullable=False)
