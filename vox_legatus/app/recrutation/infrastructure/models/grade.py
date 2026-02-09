from sqlalchemy import Column, Float, Integer, DateTime, ForeignKey, func, Enum as SqlEnum
from sqlalchemy.orm import relationship

from app.database import Base


class GradeModel(Base):
    __tablename__ = "grades"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True, nullable=False)
    submission_id = Column(Integer, ForeignKey("submissions.id"), index=True, nullable=False)
    grader_id = Column(Integer, ForeignKey("graders.id"), index=True, nullable=False)
    grade = Column(Float, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

