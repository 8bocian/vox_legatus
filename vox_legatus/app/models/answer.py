from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, func, Enum as SqlEnum
from sqlalchemy.orm import relationship

from app.database import Base
from app.enums import PollStatus


class Answer(Base):
    __tablename__ = "answers"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True, nullable=False)
    poll_id = Column(Integer, ForeignKey("polls.id"), index=True, nullable=False)
    creator_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    question_id = Column(Integer, ForeignKey("questions.id"), index=True, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    content = Column(String, nullable=True)

    question = relationship("Question", back_populates="answers")
    votes = relationship("Vote", back_populates="answer", cascade="all, delete-orphan")
    poll = relationship("Poll", back_populates="answers")
    creator = relationship("User", back_populates="answers")
