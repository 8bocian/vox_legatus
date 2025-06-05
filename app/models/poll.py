from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, func, Enum as SqlEnum
from app.database import Base
from app.enums import PollStatus


class Poll(Base):
    __tablename__ = "polls"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True, nullable=False)
    creator_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    title = Column(String, index=True, nullable=False)
    status = Column(SqlEnum(PollStatus), default=PollStatus.WAITING_FOR_ACTIVATION, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    opened_at = Column(DateTime, nullable=True)
    closed_at = Column(DateTime, nullable=True)
