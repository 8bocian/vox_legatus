from typing import Optional, Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.recrutation.infrastructure.models.grader import GraderModel

class GraderRepo:
    async def create(self, session: AsyncSession, group_id: int) -> int:
        grader = GraderModel(group_id=group_id)
        session.add(grader)
        await session.flush()
        return grader.id

    async def assign_user(self, session: AsyncSession, grader_id:int, user_id: int) -> bool:
        grader = await session.get(GraderModel, grader_id)
        grader.user_id = user_id
        return True

    async def delete(self, session: AsyncSession, grader_id: int) -> bool:
        grader = await session.get(GraderModel, grader_id)
        await session.delete(grader)
        return True

    async def get_by_user_id(self, session: AsyncSession, user_id: int) -> Sequence[GraderModel]:
        graders_results = await session.execute(
            select(GraderModel).where(GraderModel.user_id == user_id)
        )
        graders = graders_results.scalars().all()
        return graders

    async def get_by_group_id(self, session: AsyncSession, group_id: int) -> Sequence[GraderModel]:
        graders_results = await session.execute(
            select(GraderModel).where(GraderModel.group_id == group_id)
        )
        graders = graders_results.scalars().all()
        return graders

    async def get(self, session: AsyncSession, grader_id: int) -> Optional[GraderModel]:
        grader = session.get(GraderModel, grader_id)
        return grader