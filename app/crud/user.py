from sqlalchemy import desc
from typing import List, Type
from sqlalchemy.orm import Session
from app.models import User


def get_user(db: Session, user_id: int):
    return db.query(User).get(user_id)

def create_user(db: Session, user: UserCreate):
    new_user = User(
        name=
        surname=
        email=
        role=
    )
    return db.add()