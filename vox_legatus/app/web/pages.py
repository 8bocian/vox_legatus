import time

from fastapi import APIRouter, Request, Depends, Form
from fastapi.responses import HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from starlette.templating import Jinja2Templates
from app.auth import get_current_user_html, require_role_html
from app.database import get_db
from app.enums import Role
from app.models import Poll, User
from typing import Annotated, Union
from fastapi.responses import RedirectResponse

router = APIRouter()
templates = Jinja2Templates(directory="./app/templates")


@router.get("/", include_in_schema=False)
async def root(
    request: Request,
    current_user: Union[User, RedirectResponse] = Depends(get_current_user_html)
):
    # If the user was not authenticated, RedirectResponse will be returned
    if isinstance(current_user, RedirectResponse):
        return current_user

    # Redirect based on role
    if current_user.role == Role.ADMIN:
        return RedirectResponse("/dashboard")
    else:
        return RedirectResponse("/vote")


@router.get("/login", response_class=HTMLResponse)
def login_page(
        request: Request
):
    return templates.TemplateResponse("login.html", {"request": request, "timestamp": int(time.time())})


@router.get("/dashboard")
async def dashboard(
    request: Request,
    user: Annotated[User, Depends(require_role_html(Role.ADMIN))],
):
    print("test")
    if isinstance(user, RedirectResponse):
        return user
    return templates.TemplateResponse("dashboard.html", {"request": request, "user": user, "timestamp":int(time.time())})

@router.get("/vote")
async def dashboard(
    request: Request,
    user: Annotated[User, Depends(get_current_user_html)],
):
    print("test")
    if isinstance(user, RedirectResponse):
        return user
    return templates.TemplateResponse("vote.html", {"request": request, "user": user, "timestamp":int(time.time())})
