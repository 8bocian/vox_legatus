from sqlalchemy import Column, Float, Integer, String, ForeignKey, func, Enum as SqlEnum
from sqlalchemy.orm import relationship

from app.database import Base

from app.recrutation.presentation.schemas.ticket import TicketStatus


class TicketModel(Base):
    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True, nullable=False)
    grade_id = Column(Integer, ForeignKey("grades.id"), index=True, nullable=True)
    new_grade = Column(Float, nullable=False)
    status = Column(SqlEnum(TicketStatus), default=TicketStatus.WAITING, nullable=False)
    explanation = Column(String, nullable=False)
