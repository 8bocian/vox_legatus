from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, func, Enum as SqlEnum
from sqlalchemy.orm import relationship

from app.database import Base


class SubmissionModel(Base):
    __tablename__ = "submissions"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True, nullable=False)
    group_id = Column(Integer, ForeignKey("grading_groups.id"), index=True, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    submission_number = Column(String, nullable=False)
    about_me = Column(String, nullable=True)
    subject_1 = Column(String, nullable=True)
    subject_2 = Column(String, nullable=True)
    subject_1_answer = Column(String, nullable=True)
    subject_2_answer = Column(String, nullable=True)
