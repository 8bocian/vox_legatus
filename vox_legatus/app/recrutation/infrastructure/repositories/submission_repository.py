from typing import Sequence, Optional

from sqlalchemy import select, or_, func, and_, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.recrutation.infrastructure.models.submission import SubmissionModel
from app.recrutation.presentation.schemas.submission import SubmissionCreate
from app.recrutation.infrastructure.models.grade import GradeModel
from app.recrutation.infrastructure.models.grader import GraderModel


class SubmissionRepo:
    async def create(self, session: AsyncSession, create_submission: SubmissionCreate):
        submission = SubmissionModel(
            submission_number=create_submission.submission_number,
            about_me=create_submission.about_me,
            subject_1=create_submission.subject_1,
            subject_2=create_submission.subject_2,
            subject_1_answer=create_submission.subject_1_answer,
            subject_2_answer=create_submission.subject_2_answer,
        )
        session.add(submission)
        await session.flush()
        return submission.id

    async def get_all(self, session: AsyncSession, search: Optional[str]=None) -> Sequence[SubmissionModel]:
        stmt = select(SubmissionModel)
        if search:
            stmt = stmt.where(
                or_(
                    SubmissionModel.submission_number.ilike(f"%{search}%"),
                    SubmissionModel.about_me.ilike(f"%{search}%"),
                    SubmissionModel.subject_1.ilike(f"%{search}%"),
                    SubmissionModel.subject_2.ilike(f"%{search}%")
                )
            )
        submissions_results = await session.execute(stmt)
        submissions = submissions_results.scalars().all()
        return submissions

    async def get(self, session: AsyncSession, submission_id: int) -> Optional[SubmissionModel]:
        submission = await session.get(SubmissionModel, submission_id)
        return submission

    async def assign(self, session: AsyncSession, submission_id: int, group_id: int) -> bool:
        submission = await session.get(SubmissionModel, submission_id)
        if submission:
            submission.group_id = group_id
            return True
        return False

    async def get_random_for_grader(self, session: AsyncSession, grader_id: int) -> Optional[SubmissionModel]:
        stmt = (
            select(SubmissionModel)
            .join(GraderModel, SubmissionModel.group_id == GraderModel.group_id)
            .outerjoin(
                GradeModel,
                and_(
                    GradeModel.submission_id == SubmissionModel.id,
                    GradeModel.grader_id == grader_id
                )
            )
            .where(
                GraderModel.id == grader_id,
                GradeModel.id.is_(None)  # nie ocenione przez tego gracera
            )
            .order_by(func.random())  # RANDOM() w PostgreSQL
            .limit(1)
        )

        result = await session.execute(stmt)
        submission = result.scalar_one_or_none()
        return submission

    async def clear_for_group(self, session: AsyncSession, group_id: int):
        stmt = (
            select(SubmissionModel)
            .where(
                SubmissionModel.group_id == group_id,
            )
        )

        submissions = await session.execute(stmt)
        for submission in submissions:
            await session.delete(submission)


    async def delete_all(self, session: AsyncSession):
        await session.execute(delete(SubmissionModel))