import time

from fastapi import APIRouter, Request, Depends, Form
from fastapi.responses import HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from starlette.templating import Jinja2Templates
from app.auth import get_current_user_html
from app.database import get_db
from app.models import Poll, User
from typing import Annotated
from fastapi.responses import RedirectResponse

router = APIRouter()
templates = Jinja2Templates(directory="./app/templates")


@router.get("/login", response_class=HTMLResponse)
def login_page(request: Request):
    return templates.TemplateResponse("login.html", {"request": request, "timestamp": int(time.time())})


@router.get("/dashboard")
async def dashboard(
    request: Request,
    user: Annotated[User, Depends(get_current_user_html)],
):
    print("test")
    if isinstance(user, RedirectResponse):
        return user
    return templates.TemplateResponse("dashboard.html", {"request": request, "user": user, "timestamp":int(time.time())})

@router.get("/dashboard-user")
async def dashboard(
    request: Request,
    user: Annotated[User, Depends(get_current_user_html)],
):
    print("test")
    if isinstance(user, RedirectResponse):
        return user
    return templates.TemplateResponse("dashboard-user.html", {"request": request, "user": user, "timestamp":int(time.time())})
