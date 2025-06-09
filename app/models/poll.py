from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, func, Enum as SqlEnum
from sqlalchemy.orm import relationship

from app.database import Base
from app.enums import PollStatus


class Poll(Base):
    __tablename__ = "polls"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True, nullable=False)
    creator_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    title = Column(String, index=True, nullable=True)
    description = Column(String, nullable=True)
    status = Column(SqlEnum(PollStatus), default=PollStatus.WAITING_FOR_ACTIVATION, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    opened_at = Column(DateTime, nullable=True)
    closed_at = Column(DateTime, nullable=True)

    creator = relationship("User", back_populates="polls")
    questions = relationship("Question", back_populates="poll", cascade="all, delete-orphan")
    answers = relationship("Answer", back_populates="poll", cascade="all, delete-orphan")
    votes = relationship("Vote", back_populates="poll", cascade="all, delete-orphan")
    voters = relationship("Voter", back_populates="poll", cascade="all, delete-orphan")
