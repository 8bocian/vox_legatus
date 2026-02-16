from typing import Sequence, Optional

from sqlalchemy import select, delete, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.recrutation.infrastructure.models.grade import GradeModel


class GradeRepo:
    async def get(self, session: AsyncSession, grade_id: int) -> Optional[GradeModel]:
        grade = await session.get(GradeModel, grade_id)
        return grade

    async def get_by_submission_id_grader_id(self, session: AsyncSession, submission_id: int, grader_id: int) -> GradeModel:
        grades_result = await session.execute(
            select(GradeModel).where(GradeModel.submission_id == submission_id).where(GradeModel.grader_id == grader_id)
        )
        return grades_result.scalar_one_or_none()


    async def get_for_grader(self, session: AsyncSession, grader_id: int) -> Sequence[GradeModel]:
        grades_result = await session.execute(
            select(GradeModel).where(GradeModel.grader_id == grader_id)
        )
        return grades_result.scalars().all()


    async def get_average_grade_for_grader(self, session: AsyncSession, grader_id: int) -> Optional[float]:
        result = await session.execute(
            select(
                func.round(func.avg(GradeModel.grade), 1)
            )
            .where(GradeModel.grader_id == grader_id)
        )

        avg = result.scalar()
        return float(avg) if avg is not None else None

    async def change_grade(self, session: AsyncSession, grade_id: int, new_grade: float) -> int:
        grade = await session.get(GradeModel, grade_id)
        grade.grade = new_grade
        return grade.id


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

    async def delete_all(self, session: AsyncSession):
        await session.execute(delete(GradeModel))


    async def delete(self, session: AsyncSession, grade_id: int):
        grade = await session.get(GradeModel, grade_id)
        await session.delete(grade)

    async def get_grades_count_for_grader(self, session: AsyncSession, grader_id: int) -> int:
        stmt = (
            select(func.count())
            .select_from(GradeModel)
            .where(GradeModel.grader_id == grader_id)
        )
        result = await session.execute(stmt)
        grades_count = result.scalar_one()
        return grades_count