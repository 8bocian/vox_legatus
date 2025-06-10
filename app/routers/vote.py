from typing import Annotated

from fastapi import APIRouter, Body, Path, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.vote import VoteCreateInput

router = APIRouter()


