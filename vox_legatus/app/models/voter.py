from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, func, Enum as SqlEnum
from sqlalchemy.orm import relationship

from app.database import Base
from app.enums import PollStatus


class Voter(Base):
    __tablename__ = "voters"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True, nullable=False)
    poll_id = Column(Integer, ForeignKey("polls.id"), index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    voted_at = Column(DateTime, nullable=True)

    poll = relationship("Poll", back_populates="voters")
    user = relationship("User", back_populates="voters")
    votes = relationship("Vote", back_populates="voter", cascade="all, delete-orphan")