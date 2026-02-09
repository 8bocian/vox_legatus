from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, func, Enum as SqlEnum
from sqlalchemy.orm import relationship

from app.database import Base


class GradingGroupModel(Base):
    __tablename__ = "grading_groups"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    graders = relationship(
        "GraderModel",
        backref="group",
        cascade="all, delete-orphan",
        passive_deletes=True
    )