from typing import Sequence, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from ..models.grading_group import GradingGroupModel

from app.recrutation.presentation.schemas.grading_group import GroupCreateRequest, GroupUpdateRequest, GradingGroupFilters

class GroupRepo:

    async def create(self, session: AsyncSession) -> GradingGroupModel:
        grading_group = GradingGroupModel()
        session.add(grading_group)
        await session.flush(grading_group)
        return grading_group

    async def get_filter(self, session: AsyncSession, filters: Optional[GradingGroupFilters]=None) -> Sequence[GradingGroupModel]:
        if not filters:
            groups_result = await session.execute(
                select(GradingGroupModel)
            )
            groups = groups_result.scalars().all()
        else:
            groups = []
        return groups

    async def update(self, session: AsyncSession, group_id: int, group_update: GroupUpdateRequest) -> Optional[GradingGroupModel]:
        group = await session.get(GradingGroupModel, group_id)
        if group:
            group.graders_count = group_update.graders_count
            await session.flush()
        return group


    async def remove(self, session: AsyncSession, group_id: int) -> bool:
        group = await session.get(GradingGroupModel, group_id)
        await session.delete(group)
        return True

