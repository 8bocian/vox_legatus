from fastapi import FastAPI
from app.auth import hash_password
from app.enums import Role
from app.models import User
from app.routers import auth, user, poll, question, vote, voter
from app.recrutation.presentation.endpoints import submission, graders_group
from app.web import pages
from app.database import get_db, async_engine, Base
from sqlalchemy.future import select
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import asyncio

if "anext" not in dir(__builtins__):
    async def anext(aiter):
        return await aiter.__anext__()

app = FastAPI()

import mimetypes

# Force .js files to be served with correct MIME type
mimetypes.add_type("application/javascript", ".js")

app.mount("/static", StaticFiles(directory="app/static"), name="static")


@app.on_event("startup")
async def create_default_admin():

    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    db_gen = get_db()
    db = await anext(db_gen)
    admin_user = select(User).filter(User.name == "admin")
    admin_user = (await db.execute(admin_user)).first()

    print(admin_user)

    if not admin_user:
        hashed_password = hash_password("admin")
        admin_user = User(
            name="admin",
            surname="admin",
            email="admin@admin.com",
            password=hashed_password,
            role=Role.ADMIN
        )
        db.add(admin_user)
        await db.commit()
        print("Default admin user created")
    else:
        print("Admin user already exists")

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(user.router, prefix="/api/user", tags=["user"])
app.include_router(poll.router, prefix="/api/poll", tags=["poll"])
app.include_router(question.router, prefix="/api/question", tags=["question"])
app.include_router(voter.router, prefix="/api/voter", tags=["voter"])
app.include_router(vote.router, prefix="/api/vote", tags=["vote"])
app.include_router(submission.router, prefix="/api/submissions", tags=["submissions"])
app.include_router(graders_group.router, prefix="/api/graders_group", tags=["graders_group"])

app.include_router(pages.router)
