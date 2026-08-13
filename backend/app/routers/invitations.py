from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import datetime as dt

from app.database import get_db
from app.models import (
    Invitation,
    Meeting,
    MeetingParticipant,
    User,
    utcnow,
)
from app.schemas import (
    InvitationCreate,
    InvitationResponse,
    InvitationStatusUpdate,
)

router = APIRouter(
    prefix="/invitations",
    tags=["invitations"],
)


INVITATION_DURATION_MINUTES = 10


# --------------------------------------------------
# Helpers
# --------------------------------------------------

def get_user(
    db: Session,
    user_id: int,
) -> User:

    user = db.get(User, user_id)

    if not user or not user.is_active:
        raise HTTPException(
            status_code=404,
            detail="User not found.",
        )

    return user


def get_meeting(
    db: Session,
    meeting_id: int,
) -> Meeting:

    meeting = db.get(
        Meeting,
        meeting_id,
    )

    if not meeting:
        raise HTTPException(
            status_code=404,
            detail="Meeting not found.",
        )

    return meeting


def expire_old_invitations(
    db: Session,
) -> None:

    now = utcnow()

    db.query(Invitation).filter(
        Invitation.status == "pending",
        Invitation.expires_at <= now,
    ).update(
        {
            Invitation.status: "expired",
        },
        synchronize_session=False,
    )

    db.commit()


def invitation_to_response(
    invitation: Invitation,
) -> InvitationResponse:

    return InvitationResponse(
        id=invitation.id,

        meeting_id=invitation.meeting_id,
        room_code=invitation.meeting.room_code,
        meeting_title=invitation.meeting.title,

        sender_id=invitation.sender_id,
        sender_name=invitation.sender.name,
        sender_username=invitation.sender.username,

        receiver_id=invitation.receiver_id,
        receiver_name=invitation.receiver.name,
        receiver_username=invitation.receiver.username,

        status=invitation.status,

        created_at=invitation.created_at,
        expires_at=invitation.expires_at,
        responded_at=invitation.responded_at,
    )


# --------------------------------------------------
# Create Invitation
# --------------------------------------------------

@router.post(
    "",
    response_model=InvitationResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_invitation(
    payload: InvitationCreate,
    db: Session = Depends(get_db),
):

    meeting = get_meeting(
        db,
        payload.meeting_id,
    )

    sender = get_user(
        db,
        payload.sender_id,
    )

    receiver = get_user(
        db,
        payload.receiver_id,
    )

    # ----------------------------------------------
    # Basic validation
    # ----------------------------------------------

    if sender.id == receiver.id:
        raise HTTPException(
            status_code=400,
            detail="You cannot invite yourself.",
        )

    if meeting.status in {
        "ended",
        "cancelled",
    }:
        raise HTTPException(
            status_code=400,
            detail="This meeting is no longer active.",
        )

    # ----------------------------------------------
    # Sender must be a meeting participant
    # ----------------------------------------------

    sender_participation = (
        db.query(MeetingParticipant)
        .filter(
            MeetingParticipant.meeting_id
            == meeting.id,
            MeetingParticipant.user_id
            == sender.id,
        )
        .first()
    )

    if not sender_participation:
        raise HTTPException(
            status_code=403,
            detail=(
                "You must be a participant "
                "of the meeting to send invitations."
            ),
        )

    # ----------------------------------------------
    # Receiver already participating?
    # ----------------------------------------------

    receiver_participation = (
        db.query(MeetingParticipant)
        .filter(
            MeetingParticipant.meeting_id
            == meeting.id,
            MeetingParticipant.user_id
            == receiver.id,
        )
        .first()
    )

    if receiver_participation:
        raise HTTPException(
            status_code=409,
            detail="This user is already in the meeting.",
        )

    # ----------------------------------------------
    # Check existing invitation
    # ----------------------------------------------

    existing = (
        db.query(Invitation)
        .filter(
            Invitation.meeting_id == meeting.id,
            Invitation.receiver_id == receiver.id,
            Invitation.status == "pending",
        )
        .first()
    )

    if existing:

        # If the old invitation expired, convert it
        # to expired and allow a new invitation.
        if existing.expires_at <= utcnow():

            existing.status = "expired"
            db.commit()

        else:

            raise HTTPException(
                status_code=409,
                detail=(
                    "A pending invitation already "
                    "exists for this user."
                ),
            )

    # ----------------------------------------------
    # Create invitation
    # ----------------------------------------------

    created_at = utcnow()

    expires_at = created_at + dt.timedelta(
        minutes=INVITATION_DURATION_MINUTES
    )

    invitation = Invitation(
        meeting_id=meeting.id,
        sender_id=sender.id,
        receiver_id=receiver.id,
        status="pending",
        created_at=created_at,
        expires_at=expires_at,
    )

    db.add(invitation)

    db.commit()
    db.refresh(invitation)

    return invitation_to_response(
        invitation
    )


# --------------------------------------------------
# Get all invitations for a user
# --------------------------------------------------

@router.get(
    "/user/{user_id}",
    response_model=List[InvitationResponse],
)
def list_invitations(
    user_id: int,
    db: Session = Depends(get_db),
):

    get_user(
        db,
        user_id,
    )

    expire_old_invitations(db)

    invitations = (
        db.query(Invitation)
        .filter(
            (
                Invitation.sender_id == user_id
            )
            |
            (
                Invitation.receiver_id
                == user_id
            )
        )
        .order_by(
            Invitation.created_at.desc()
        )
        .all()
    )

    return [
        invitation_to_response(invitation)
        for invitation in invitations
    ]


# --------------------------------------------------
# Received invitations only
# --------------------------------------------------

@router.get(
    "/received/{user_id}",
    response_model=List[InvitationResponse],
)
def get_received_invitations(
    user_id: int,
    db: Session = Depends(get_db),
):

    get_user(
        db,
        user_id,
    )

    expire_old_invitations(db)

    invitations = (
        db.query(Invitation)
        .filter(
            Invitation.receiver_id == user_id
        )
        .order_by(
            Invitation.created_at.desc()
        )
        .all()
    )

    return [
        invitation_to_response(invitation)
        for invitation in invitations
    ]


# --------------------------------------------------
# Sent invitations
# --------------------------------------------------

@router.get(
    "/sent/{user_id}",
    response_model=List[InvitationResponse],
)
def get_sent_invitations(
    user_id: int,
    db: Session = Depends(get_db),
):

    get_user(
        db,
        user_id,
    )

    expire_old_invitations(db)

    invitations = (
        db.query(Invitation)
        .filter(
            Invitation.sender_id == user_id
        )
        .order_by(
            Invitation.created_at.desc()
        )
        .all()
    )

    return [
        invitation_to_response(invitation)
        for invitation in invitations
    ]


# --------------------------------------------------
# Accept / Decline / Cancel
# --------------------------------------------------

@router.patch(
    "/{invitation_id}",
    response_model=InvitationResponse,
)
def update_invitation(
    invitation_id: int,
    payload: InvitationStatusUpdate,
    db: Session = Depends(get_db),
):

    invitation = db.get(
        Invitation,
        invitation_id,
    )

    if not invitation:
        raise HTTPException(
            status_code=404,
            detail="Invitation not found.",
        )

    actor = get_user(
        db,
        payload.user_id,
    )

    # ----------------------------------------------
    # Pending check
    # ----------------------------------------------

    if invitation.status != "pending":

        raise HTTPException(
            status_code=409,
            detail=(
                "This invitation is no longer pending."
            ),
        )

    # ----------------------------------------------
    # Expiry check
    # ----------------------------------------------

    if invitation.expires_at <= utcnow():

        invitation.status = "expired"

        db.commit()

        raise HTTPException(
            status_code=400,
            detail="This invitation has expired.",
        )

    # ----------------------------------------------
    # Accept / decline permissions
    # ----------------------------------------------

    if payload.status in {
        "accepted",
        "declined",
    }:

        if actor.id != invitation.receiver_id:

            raise HTTPException(
                status_code=403,
                detail=(
                    "Only the invited user can "
                    "accept or decline this invitation."
                ),
            )

    # ----------------------------------------------
    # Cancel permissions
    # ----------------------------------------------

    if payload.status == "cancelled":

        if actor.id != invitation.sender_id:

            raise HTTPException(
                status_code=403,
                detail=(
                    "Only the sender can cancel "
                    "this invitation."
                ),
            )

    # ----------------------------------------------
    # Accept invitation
    # ----------------------------------------------

    if payload.status == "accepted":

        already_joined = (
            db.query(MeetingParticipant)
            .filter(
                MeetingParticipant.meeting_id
                == invitation.meeting_id,
                MeetingParticipant.user_id
                == invitation.receiver_id,
            )
            .first()
        )

        if not already_joined:

            participant = MeetingParticipant(
                meeting_id=invitation.meeting_id,
                user_id=invitation.receiver_id,
                role="participant",
                joined_at=utcnow(),
            )

            db.add(participant)

    invitation.status = payload.status
    invitation.responded_at = utcnow()

    db.commit()
    db.refresh(invitation)

    return invitation_to_response(
        invitation
    )