from typing import Annotated, Sequence

from fastapi import APIRouter, Depends, Body, Path, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import require_role
from app.database import get_db
from app.enums.role import Role
from app.models.user import User
from app.recrutation.infrastructure.repositories.grading_group_repository import GroupRepo
from app.recrutation.infrastructure.repositories.grader_repository import GraderRepo
from app.recrutation.infrastructure.repositories.grade_repository import GradeRepo
from app.recrutation.presentation.schemas.grader import CreateGraderRequest, GraderRead
from app.recrutation.presentation.schemas.grading_group import GroupRead, GradingGroupFilters

router = APIRouter()

@router.post("")
async def create_graders_group(
        admin: Annotated[User, Depends(require_role(Role.ADMIN))],
        session: Annotated[AsyncSession, Depends(get_db)],
        group_repo: Annotated[GroupRepo, Depends()]
) -> GroupRead:
    created_group_id = await group_repo.create(session)
    return GroupRead(group_id=created_group_id, graders_ids=[])


@router.get("")
async def get_graders_groups(
        admin: Annotated[User, Depends(require_role(Role.ADMIN))],
        group_filters: Annotated[GradingGroupFilters, Query()],
        session: Annotated[AsyncSession, Depends(get_db)],
        group_repo: Annotated[GroupRepo, Depends()],
        grader_repo: Annotated[GraderRepo, Depends()]
) -> Sequence[GroupRead]:
    groups = await group_repo.get_filter(session, group_filters)
    graders_groups: list[GroupRead] = []
    for group in groups:
        graders = await grader_repo.get_by_group_id(session, group.id)
        graders_group = GroupRead(
            group_id=group.id,
            graders_ids=[grader.id for grader in graders]
        )
        graders_groups.append(graders_group)
    return graders_groups


@router.delete("/{group_id}")
async def remove_group(
        admin: Annotated[User, Depends(require_role(Role.ADMIN))],
        group_id: Annotated[int, Path()],
        session: Annotated[AsyncSession, Depends(get_db)],
        group_repo: Annotated[GroupRepo, Depends()],
        grader_repo: Annotated[GraderRepo, Depends()],
        grade_repo: Annotated[GradeRepo, Depends()]
) -> bool:
    graders = await grader_repo.get_by_group_id(session, group_id)
    for grader in graders:
        grades = await grade_repo.get_for_grader(session, grader.id)
        for grade in grades:
            await grade_repo.delete(session, grade.id)
        await grader_repo.delete(session, grader.id)
    has_removed = await group_repo.remove(session, group_id)
    return has_removed

@router.post("/{group_id}/graders/{grader_id}")
async def assign_user(
        admin: Annotated[User, Depends(require_role(Role.ADMIN))],
        grader_to_add: Annotated[CreateGraderRequest, Body()],
        grader_id: Annotated[int, Path()],
        session: Annotated[AsyncSession, Depends(get_db)],
        grader_repo: Annotated[GraderRepo, Depends()]
) -> bool:
    is_assigned = await grader_repo.assign_user(session, grader_id, grader_to_add.user_id)
    return is_assigned

@router.post("/{group_id}/graders")
async def create_grader(
        admin: Annotated[User, Depends(require_role(Role.ADMIN))],
        group_id: Annotated[int, Path()],
        session: Annotated[AsyncSession, Depends(get_db)],
        grader_repo: Annotated[GraderRepo, Depends()]
) -> int:
    grader_id = await grader_repo.create(session, group_id)
    return grader_id


@router.delete("/{group_id}/graders/{grader_id}")
async def remove_grader_from_group(
        admin: Annotated[User, Depends(require_role(Role.ADMIN))],
        group_id: Annotated[int, Path()],
        grader_id: Annotated[int, Path()],
        session: Annotated[AsyncSession, Depends(get_db)],
        grader_repo: Annotated[GraderRepo, Depends()]
) -> bool:
    has_removed = await grader_repo.delete(session, grader_id)
    return has_removed
