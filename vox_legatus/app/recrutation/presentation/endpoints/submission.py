import csv
from io import StringIO
from typing import Annotated, Optional, Sequence

from fastapi import APIRouter, Body, Depends, Path, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import require_role
from app.config import SUBMISSIONS_MAPPING
from app.database import get_db
from app.enums.role import Role
from app.models.user import User
from app.recrutation.infrastructure.repositories.grade_repository import GradeRepo
from app.recrutation.infrastructure.repositories.grader_repository import GraderRepo
from app.recrutation.infrastructure.repositories.grading_group_repository import GroupRepo
from app.recrutation.infrastructure.repositories.submission_repository import SubmissionRepo
from app.recrutation.presentation.schemas.submission import SubmissionCreate, SubmissionRead, SubmissionGradeRequest
from app.recrutation.presentation.schemas.grade import GradeRead
from app.recrutation.presentation.schemas.submission import SubmissionGraderRead
from app.crud import user as user_crud

router = APIRouter()

@router.post("")
async def add_submissions(
        admin: Annotated[User, Depends(require_role(Role.ADMIN))],
        submissions_file: Annotated[UploadFile, File()],
        session: Annotated[AsyncSession, Depends(get_db)],
        submission_repo: Annotated[SubmissionRepo, Depends()]
):
    content = await submissions_file.read()
    decoded = content.decode("utf-8")

    reader = csv.DictReader(StringIO(decoded))
    for row in reader:
        create_submission = SubmissionCreate(
            submission_number=str(row[SUBMISSIONS_MAPPING.submission_number]),
            about_me=str(row[SUBMISSIONS_MAPPING.about_me]),
            subject_1=str(row[SUBMISSIONS_MAPPING.subject_1]),
            subject_2=str(row[SUBMISSIONS_MAPPING.subject_2]),
            subject_1_answer=str(row[SUBMISSIONS_MAPPING.subject_1_answer]),
            subject_2_answer=str(row[SUBMISSIONS_MAPPING.subject_2_answer])
        )
        await submission_repo.create(session, create_submission)
    return True


@router.get("/random")
async def get_random(
        user: Annotated[User, Depends(require_role(Role.GRADER))],
        session: Annotated[AsyncSession, Depends(get_db)],
        submission_repo: Annotated[SubmissionRepo, Depends()],
        grader_repo: Annotated[GraderRepo, Depends()],
) -> SubmissionGraderRead:
    graders = await grader_repo.get_by_user_id(session, user.id)
    grader = graders[0]
    random_submission = await submission_repo.get_random_for_grader(session, grader.id)
    return SubmissionGraderRead(
        id=random_submission.id,
        submission_number=random_submission.submission_number,
        about_me=random_submission.about_me,
        subject_1=random_submission.subject_1,
        subject_2=random_submission.subject_2,
        subject_1_answer=random_submission.subject_1_answer,
        subject_2_answer=random_submission.subject_2_answer,
        group_id=grader.group_id,
        already_graded=False
    )


@router.get("")
async def get_submissions(
        admin: Annotated[User, Depends(require_role(Role.ADMIN))],
        session: Annotated[AsyncSession, Depends(get_db)],
        submission_repo: Annotated[SubmissionRepo, Depends()],
        search: Annotated[Optional[str], Query(max_length=64)] = None,
) -> list[SubmissionRead]:
    submissions = await submission_repo.get_all(session, search)
    return [
        SubmissionRead(
            id = submission.id,
            group_id = submission.group_id,
            submission_number = submission.submission_number,
            about_me = submission.about_me,
            subject_1 = submission.subject_1,
            subject_2 = submission.subject_2,
            subject_1_answer = submission.subject_1_answer,
            subject_2_answer = submission.subject_2_answer
        )
        for submission in submissions
    ]


@router.get("/{submission_id}")
async def get_submission(
        user: Annotated[User, Depends(require_role([Role.GRADER, Role.ADMIN]))],
        session: Annotated[AsyncSession, Depends(get_db)],
        submission_id: Annotated[int, Path()],
        submission_repo: Annotated[SubmissionRepo, Depends()],
        grader_repo: Annotated[GraderRepo, Depends()]
) -> Optional[SubmissionRead]:
    graders = await grader_repo.get_by_user_id(session, user.id)
    grader = graders[0]
    submission = await submission_repo.get(session, submission_id)
    if submission.group_id == grader.group_id:
        return SubmissionRead(
            id=submission.id,
            group_id=submission.group_id,
            submission_number=submission.submission_number,
            about_me=submission.about_me,
            subject_1=submission.subject_1,
            subject_2=submission.subject_2,
            subject_1_answer=submission.subject_1_answer,
            subject_2_answer=submission.subject_2_answer,
        )
    else:
        return None

@router.get("/{submission_id}/grades")
async def get_submission_grades(
        user: Annotated[User, Depends(require_role([Role.GRADER, Role.ADMIN]))],
        session: Annotated[AsyncSession, Depends(get_db)],
        submission_id: Annotated[int, Path()],
        submission_repo: Annotated[SubmissionRepo, Depends()],
        grader_repo: Annotated[GraderRepo, Depends()],
        grade_repo: Annotated[GradeRepo, Depends()]
) -> Sequence[GradeRead]:
    grades = await grade_repo.get_for_submission(session, submission_id)
    grades_real: list[GradeRead] = []
    for grade in grades:
        grader = await grader_repo.get(session, grade.grader_id)
        user = await user_crud.get_user(session, grader.user_id)
        grades_real.append(
            GradeRead(
                username=f"{user.name} {user.surname}",
                grade=grade.grade,
                grader_id=grader.id,
                grade_id=grade.id
            )
        )
    return grades_real

@router.post("/{submission_id}/grade")
async def grade_submission(
        user: Annotated[User, Depends(require_role([Role.GRADER, Role.ADMIN]))],
        session: Annotated[AsyncSession, Depends(get_db)],
        submission_grade: Annotated[SubmissionGradeRequest, Body()],
        submission_id: Annotated[int, Path()],
        submission_repo: Annotated[SubmissionRepo, Depends()],
        grader_repo: Annotated[GraderRepo, Depends()],
        grade_repo: Annotated[GradeRepo, Depends()]
) -> bool:
    graders = await grader_repo.get_by_user_id(session, user.id)
    grader = graders[0]
    submission = await submission_repo.get(session, submission_id)
    if submission.group_id != grader.group_id:
        return False

    grade = await grade_repo.get_by_submission_id_grader_id(session, submission_id, grader.id)
    if grade:
        return False
    else:
        await grade_repo.create(session, submission_id, grader.id, submission_grade.grade)
    return True

@router.post("/assign")
async def assign_submissions(
        admin: Annotated[User, Depends(require_role(Role.ADMIN))],
        session: Annotated[AsyncSession, Depends(get_db)],
        submission_repo: Annotated[SubmissionRepo, Depends()],
        group_repo: Annotated[GroupRepo, Depends()]
):
    grading_groups = await group_repo.get_filter(session)
    groups_n = len(grading_groups)
    if groups_n > 0:
        submissions = await submission_repo.get_all(session)
        for idx, submission in enumerate(submissions):
            group_number = idx % groups_n
            group = grading_groups[group_number]
            await submission_repo.assign(session, submission.id, group.id)
