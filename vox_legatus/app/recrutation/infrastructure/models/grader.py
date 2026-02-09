from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, func, Enum as SqlEnum
from sqlalchemy.orm import relationship

from app.database import Base


class GraderModel(Base):
    __tablename__ = "graders"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=True)
    group_id = Column(Integer, ForeignKey("grading_groups.id"), index=True, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)




