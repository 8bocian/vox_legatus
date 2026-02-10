from typing import Sequence, Optional

from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.recrutation.infrastructure.models.submission import SubmissionModel
from app.recrutation.presentation.schemas.submission import SubmissionCreate


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

    async def get_all(self, session: AsyncSession, search: Optional[str]) -> Sequence[SubmissionModel]:
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
