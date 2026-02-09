from pydantic import BaseModel


class GroupRead(BaseModel):
    group_id: int
    graders_ids: list[int]

class GroupCreateRequest(BaseModel):
    graders_count: int

class GroupUpdateRequest(BaseModel):
    graders_count: int

class GradingGroupFilters(BaseModel):
    pass