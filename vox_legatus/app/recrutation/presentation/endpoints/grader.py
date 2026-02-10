from typing import Annotated, Sequence

from fastapi import APIRouter, Depends, Body, Path, Query
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from app.auth import require_role
from app.database import get_db
from app.enums.role import Role
from app.models.user import User
from app.recrutation.infrastructure.repositories.grader_repository import GraderRepo
from app.recrutation.presentation.schemas.grader import CreateGraderRequest, GraderRead

router = APIRouter()

@router.get("/{grader_id}")
async def get_grader(
        admin: Annotated[User, Depends(require_role(Role.ADMIN))],
        grader_id: Annotated[int, Path()],
        session: Annotated[AsyncSession, Depends(get_db)],
        grader_repo: Annotated[GraderRepo, Depends()],
) -> GraderRead:
    grader = await grader_repo.get(session, grader_id)
    return GraderRead(
        grader_id=grader.id,
        user_id=grader.user_id
    )


@router.patch("/{grader_id}/unassign")
async def unassign_user_from_grader(
    admin: Annotated[User, Depends(require_role(Role.ADMIN))],
    grader_id: Annotated[int, Path()],
    session: Annotated[AsyncSession, Depends(get_db)],
    grader_repo: Annotated[GraderRepo, Depends()]
) -> bool:
    grader = await grader_repo.get(session, grader_id)
    if not grader:
        raise HTTPException(404, "Grader nie znaleziony")

    if not grader.user_id:
        return True

    success = await grader_repo.assing_user(session, grader_id, None)
    return success