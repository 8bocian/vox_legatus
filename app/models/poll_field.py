from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, func, Enum as SqlEnum
from app.database import Base
from app.enums import PollStatus


class PollField(Base):
    __tablename__ = "poll_fields"
    id = Column(Integer, primary_key=True, autoincrement=True, index=True, nullable=False)
    poll_id = Column(Integer, ForeignKey("polls.id"), index=True, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    voted_at = Column(DateTime, nullable=True)
    status = Column(SqlEnum(PollStatus), default=PollStatus.WAITING_FOR_ACTIVATION, nullable=False)
