from sqlalchemy import desc
from typing import List, Type
from sqlalchemy.orm import Session
from app.models import Poll
from app.schemas.poll import PollCreate, PollUpdate, PollRead


def get_poll(db: Session, poll_id: int):
    return db.query(Poll).get(poll_id)

def get_poll_by_creator_id(db: Session, creator_id: int):
    return db.query(Poll).filter(Poll.)


def create_poll(db: Session, poll: PollCreate):
    new_poll = Poll(
        title=poll.title,
        status=poll.status,
        creator_id=poll.creator_id,
        opened_at=poll.opened_at,
        closed_at=poll.closed_at
    )
    db.add(new_poll)
    db.commit()
    db.refresh(new_poll)
    return new_poll