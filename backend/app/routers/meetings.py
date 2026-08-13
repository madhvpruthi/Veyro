from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import uuid

from app.database import get_db
from app.models import (
    Meeting,
    MeetingParticipant,
    User,
    utcnow,
)
from app.schemas import (
    MeetingCreate,
    MeetingResponse,
    ParticipantCreate,
    ParticipantResponse,
)

router = APIRouter(
    prefix="/meetings",
    tags=["meetings"],
)


def generate_room_code() -> str:
    raw = uuid.uuid4().hex[:9]
    return f"{raw[:3]}-{raw[3:6]}-{raw[6:]}"


def get_user_or_404(
    db: Session,
    user_id: int,
) -> User:

    user = db.get(User, user_id)

    if not user or not user.is_active:
        raise HTTPException(
            status_code=404,
            detail="User not found or inactive.",
        )

    return user


def get_meeting_or_404(
    db: Session,
    room_code: str,
) -> Meeting:

    meeting = (
        db.query(Meeting)
        .filter(Meeting.room_code == room_code)
        .first()
    )

    if not meeting:
        raise HTTPException(
            status_code=404,
            detail="Meeting not found.",
        )

    return meeting


# --------------------------------------------------
# CREATE INSTANT MEETING
# --------------------------------------------------

@router.post(
    "/instant",
    response_model=MeetingResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_instant_meeting(
    host_id: int,
    db: Session = Depends(get_db),
):

    host = get_user_or_404(db, host_id)

    now = utcnow()

    meeting = Meeting(
        room_code=generate_room_code(),
        title="Instant Meeting",
        description="Quick video session created on Veyro",
        meeting_type="instant",
        status="live",
        start_time=now,
        duration_minutes=60,
        host_id=host.id,
        created_at=now,
        updated_at=now,
    )

    db.add(meeting)
    db.flush()

    host_participant = MeetingParticipant(
        meeting_id=meeting.id,
        user_id=host.id,
        role="host",
        joined_at=now,
    )

    db.add(host_participant)

    db.commit()
    db.refresh(meeting)

    return meeting


# --------------------------------------------------
# SCHEDULE MEETING
# --------------------------------------------------

@router.post(
    "/schedule",
    response_model=MeetingResponse,
    status_code=status.HTTP_201_CREATED,
)
def schedule_meeting(
    meeting_in: MeetingCreate,
    db: Session = Depends(get_db),
):

    host = get_user_or_404(
        db,
        meeting_in.host_id,
    )

    now = utcnow()

    start = (
        meeting_in.start_time
        or now
    )

    meeting = Meeting(
        room_code=generate_room_code(),
        title=(
            meeting_in.title.strip()
            or "Scheduled Meeting"
        ),
        description=meeting_in.description,
        meeting_type="scheduled",
        status="scheduled",
        start_time=start,
        duration_minutes=meeting_in.duration_minutes,
        host_id=host.id,
        created_at=now,
        updated_at=now,
    )

    db.add(meeting)
    db.flush()

    host_participant = MeetingParticipant(
        meeting_id=meeting.id,
        user_id=host.id,
        role="host",
        joined_at=start,
    )

    db.add(host_participant)

    db.commit()
    db.refresh(meeting)

    return meeting


# --------------------------------------------------
# GET UPCOMING
# --------------------------------------------------

@router.get(
    "/upcoming",
    response_model=List[MeetingResponse],
)
def get_upcoming_meetings(
    db: Session = Depends(get_db),
):

    now = utcnow()

    return (
        db.query(Meeting)
        .filter(
            Meeting.start_time >= now,
            Meeting.status.in_(
                ["scheduled", "live"]
            ),
        )
        .order_by(
            Meeting.start_time.asc()
        )
        .all()
    )


# --------------------------------------------------
# GET RECENT
# --------------------------------------------------

@router.get(
    "/recent",
    response_model=List[MeetingResponse],
)
def get_recent_meetings(
    db: Session = Depends(get_db),
):

    now = utcnow()

    return (
        db.query(Meeting)
        .filter(
            Meeting.start_time < now
        )
        .order_by(
            Meeting.start_time.desc()
        )
        .limit(10)
        .all()
    )


# --------------------------------------------------
# GET MEETING BY ROOM CODE
# --------------------------------------------------

@router.get(
    "/{room_code}",
    response_model=MeetingResponse,
)
def get_meeting(
    room_code: str,
    db: Session = Depends(get_db),
):

    return get_meeting_or_404(
        db,
        room_code,
    )


# --------------------------------------------------
# JOIN MEETING
# --------------------------------------------------

@router.post(
    "/{room_code}/join",
    response_model=ParticipantResponse,
)
def join_meeting(
    room_code: str,
    participant_in: ParticipantCreate,
    db: Session = Depends(get_db),
):

    meeting = get_meeting_or_404(
        db,
        room_code,
    )

    user = get_user_or_404(
        db,
        participant_in.user_id,
    )

    # Already participating?
    existing = (
        db.query(MeetingParticipant)
        .filter(
            MeetingParticipant.meeting_id
            == meeting.id,
            MeetingParticipant.user_id
            == user.id,
        )
        .first()
    )

    if existing:

        # Rejoin after leaving.
        if existing.left_at is not None:

            existing.left_at = None
            existing.joined_at = utcnow()

            db.commit()
            db.refresh(existing)

        return existing

    role = (
        "host"
        if user.id == meeting.host_id
        else "participant"
    )

    participant = MeetingParticipant(
        meeting_id=meeting.id,
        user_id=user.id,
        role=role,
        joined_at=utcnow(),
    )

    db.add(participant)
    db.commit()
    db.refresh(participant)

    return participant


# --------------------------------------------------
# LEAVE MEETING
# --------------------------------------------------

@router.post(
    "/{room_code}/leave",
)
def leave_meeting(
    room_code: str,
    user_id: int,
    db: Session = Depends(get_db),
):

    meeting = get_meeting_or_404(
        db,
        room_code,
    )

    participant = (
        db.query(MeetingParticipant)
        .filter(
            MeetingParticipant.meeting_id
            == meeting.id,
            MeetingParticipant.user_id
            == user_id,
        )
        .first()
    )

    if not participant:
        raise HTTPException(
            status_code=404,
            detail="Participant not found.",
        )

    participant.left_at = utcnow()

    db.commit()

    return {
        "message": "Participant left the meeting."
    }


# --------------------------------------------------
# END MEETING
# --------------------------------------------------

@router.patch(
    "/{room_code}/end",
    response_model=MeetingResponse,
)
def end_meeting(
    room_code: str,
    db: Session = Depends(get_db),
):

    meeting = get_meeting_or_404(
        db,
        room_code,
    )

    meeting.status = "ended"
    meeting.updated_at = utcnow()

    db.commit()
    db.refresh(meeting)

    return meeting


# --------------------------------------------------
# DELETE MEETING
# --------------------------------------------------

@router.delete(
    "/{meeting_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_meeting(
    meeting_id: int,
    db: Session = Depends(get_db),
):

    meeting = db.get(
        Meeting,
        meeting_id,
    )

    if meeting:
        db.delete(meeting)
        db.commit()

    return None