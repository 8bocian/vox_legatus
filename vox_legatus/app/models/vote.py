from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, func, Enum as SqlEnum
from sqlalchemy.orm import relationship

from app.database import Base
from app.enums import PollStatus


class Vote(Base):
    __tablename__ = "votes"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True, nullable=False)
    poll_id = Column(Integer, ForeignKey("polls.id"), index=True, nullable=False)
    voter_id = Column(Integer, ForeignKey("voters.id"), index=True, nullable=False)
    question_id = Column(Integer, ForeignKey("questions.id"), index=True, nullable=False)
    answer_id = Column(Integer, ForeignKey("answers.id"), index=True, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    poll = relationship("Poll", back_populates="votes")
    voter = relationship("Voter", back_populates="votes")
    question = relationship("Question", back_populates="votes")
    answer = relationship("Answer", back_populates="votes")