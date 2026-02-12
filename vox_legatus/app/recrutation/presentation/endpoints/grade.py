from typing import Annotated, Optional, Sequence

from fastapi import APIRouter, Depends, Query, Body, Path
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import require_role
from app.database import get_db
from app.enums.role import Role
from app.models.user import User

from app.recrutation.infrastructure.repositories.ticket_repository import TicketRepo
from app.recrutation.presentation.schemas.ticket import TicketRead
from app.recrutation.infrastructure.repositories.submission_repository import SubmissionRepo

from app.recrutation.presentation.schemas.ticket import TicketStatus

from app.recrutation.infrastructure.repositories.grade_repository import GradeRepo
from app.recrutation.presentation.schemas.ticket import TicketCreate
from app.recrutation.presentation.schemas.submission import SingleSubmissionGradedRead

from app.recrutation.infrastructure.repositories.grader_repository import GraderRepo

router = APIRouter()

@router.get("/my_grades")
async def get_my(
        user: Annotated[User, Depends(require_role(Role.GRADER))],
        session: Annotated[AsyncSession, Depends(get_db)],
        submission_repo: Annotated[SubmissionRepo, Depends()],
        grade_repo: Annotated[GradeRepo, Depends()],
        grader_repo: Annotated[GraderRepo, Depends()]
) -> Sequence[SingleSubmissionGradedRead]:
    graders = await grader_repo.get_by_user_id(session, user.id)
    grader = graders[0]
    grades = await grade_repo.get_for_grader(session, grader.id)
    graded_submissions: list[SingleSubmissionGradedRead] = []
    for grade in grades:
        submission = await submission_repo.get(session, grade.submission_id)
        graded_submission = SingleSubmissionGradedRead(
            submission_id=submission.id,
            submission_number=submission.submission_number,
            subject_1=submission.subject_1,
            subject_2=submission.subject_2,
            grade_id=grade.id,
            grade=grade.grade,
        )
        graded_submissions.append(graded_submission)
    return graded_submissions

