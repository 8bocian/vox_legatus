from typing import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.recrutation.infrastructure.models.grade import GradeModel


class GradeRepo:
    async def get_by_submission_id_grader_id(self, session: AsyncSession, submission_id: int, grader_id: int) -> GradeModel:
        grades_result = await session.execute(
            select(GradeModel).where(GradeModel.submission_id == submission_id).where(GradeModel.grader_id == grader_id)
        )
        return grades_result.scalar_one_or_none()

    async def get_for_submission(self, session: AsyncSession, submission_id: int) -> Sequence[GradeModel]:
        grades_result = await session.execute(
            select(GradeModel).where(GradeModel.submission_id == submission_id)
        )
        return grades_result.scalars().all()

    async def create(self, session: AsyncSession, submission_id: int, grader_id: int, grade: float):
        grade = GradeModel(
            submission_id=submission_id,
            grader_id=grader_id,
            grade=grade
        )
        session.add(grade)