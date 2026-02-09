from typing import Annotated, Sequence

from fastapi import APIRouter, Depends, Body, Path, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import require_role
from app.database import get_db
from app.enums.role import Role
from app.models.user import User
from app.recrutation.infrastructure.repositories.grading_group_repository import GroupRepo
from app.recrutation.infrastructure.repositories.grader_repository import GraderRepo
from app.recrutation.presentation.schemas.grader import CreateGraderRequest
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
        group_repo: Annotated[GroupRepo, Depends()]
) -> Sequence[GroupRead]:
    groups = await group_repo.get_filter(session, group_filters)
    return groups

@router.delete("/{group_id}")
async def remove_group(
        admin: Annotated[User, Depends(require_role(Role.ADMIN))],
        group_id: Annotated[int, Path()],
        session: Annotated[AsyncSession, Depends(get_db)],
        group_repo: Annotated[GroupRepo, Depends()]
) -> bool:
    has_removed = await group_repo.remove(session, group_id)
    return has_removed


@router.post("/{group_id}/graders")
async def create_grader(
        admin: Annotated[User, Depends(require_role(Role.ADMIN))],
        grader_to_add: Annotated[CreateGraderRequest, Body()],
        group_id: Annotated[int, Path()],
        session: Annotated[AsyncSession, Depends(get_db)],
        grader_repo: Annotated[GraderRepo, Depends()]
) -> int:
    grader_group_id = await grader_repo.assign_user(session, group_id, grader_to_add.user_id)
    return grader_group_id


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

