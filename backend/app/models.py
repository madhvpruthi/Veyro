from __future__ import annotations

import datetime as dt
from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


def utcnow() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc).replace(tzinfo=None)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    name = Column(String(120), nullable=False)
    username = Column(String(50), nullable=False, unique=True, index=True)
    firebase_uid = Column(
    String(128),
    nullable=True,
    unique=True,
    index=True,
)
    email = Column(String(255), nullable=False, unique=True, index=True)
    password_hash = Column(String(255), nullable=False)
    is_guest = Column(Boolean, nullable=False, default=False, server_default="0")
    is_active = Column(Boolean, nullable=False, default=True, server_default="1")
    created_at = Column(DateTime, nullable=False, default=utcnow)
    updated_at = Column(DateTime, nullable=False, default=utcnow, onupdate=utcnow)

    hosted_meetings = relationship(
        "Meeting",
        back_populates="host",
        foreign_keys="Meeting.host_id",
    )
    participations = relationship(
        "MeetingParticipant",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    sent_invitations = relationship(
        "Invitation",
        back_populates="sender",
        foreign_keys="Invitation.sender_id",
        cascade="all, delete-orphan",
    )
    received_invitations = relationship(
        "Invitation",
        back_populates="receiver",
        foreign_keys="Invitation.receiver_id",
        cascade="all, delete-orphan",
    )


class Meeting(Base):
    __tablename__ = "meetings"

    id = Column(Integer, primary_key=True)
    room_code = Column(String(32), nullable=False, unique=True, index=True)
    title = Column(String(200), nullable=False, default="Instant Meeting")
    description = Column(Text, nullable=True)
    meeting_type = Column(String(20), nullable=False, default="instant")
    status = Column(String(20), nullable=False, default="scheduled")
    start_time = Column(DateTime, nullable=False, default=utcnow)
    duration_minutes = Column(Integer, nullable=False, default=60)
    host_id = Column(Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    created_at = Column(DateTime, nullable=False, default=utcnow)
    updated_at = Column(DateTime, nullable=False, default=utcnow, onupdate=utcnow)

    __table_args__ = (
        CheckConstraint("meeting_type IN ('instant', 'scheduled')", name="ck_meeting_type"),
        CheckConstraint("status IN ('scheduled', 'live', 'ended', 'cancelled')", name="ck_meeting_status"),
        CheckConstraint("duration_minutes > 0", name="ck_duration_positive"),
        Index("ix_meetings_start_status", "start_time", "status"),
    )

    host = relationship("User", back_populates="hosted_meetings", foreign_keys=[host_id])
    participants = relationship(
        "MeetingParticipant",
        back_populates="meeting",
        cascade="all, delete-orphan",
    )
    invitations = relationship(
        "Invitation",
        back_populates="meeting",
        cascade="all, delete-orphan",
    )


class MeetingParticipant(Base):
    __tablename__ = "meeting_participants"

    id = Column(Integer, primary_key=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(20), nullable=False, default="participant")
    joined_at = Column(DateTime, nullable=False, default=utcnow)
    left_at = Column(DateTime, nullable=True)

    __table_args__ = (
        UniqueConstraint("meeting_id", "user_id", name="uq_meeting_user"),
        CheckConstraint("role IN ('host', 'participant')", name="ck_participant_role"),
    )

    meeting = relationship("Meeting", back_populates="participants")
    user = relationship("User", back_populates="participations")


class Invitation(Base):
    __tablename__ = "invitations"

    id = Column(Integer, primary_key=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False, index=True)
    sender_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    receiver_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(20), nullable=False, default="pending")
    created_at = Column(DateTime, nullable=False, default=utcnow)
    expires_at = Column(DateTime, nullable=False)
    responded_at = Column(DateTime, nullable=True)

    __table_args__ = (
        CheckConstraint("status IN ('pending', 'accepted', 'declined', 'expired', 'cancelled')", name="ck_invitation_status"),
        CheckConstraint("expires_at > created_at", name="ck_invitation_expiry"),
        UniqueConstraint("meeting_id", "sender_id", "receiver_id", name="uq_meeting_invitation"),
        Index("ix_invitations_receiver_status", "receiver_id", "status"),
        Index("ix_invitations_expires_at", "expires_at"),
    )

    meeting = relationship("Meeting", back_populates="invitations")
    sender = relationship("User", back_populates="sent_invitations", foreign_keys=[sender_id])
    receiver = relationship("User", back_populates="received_invitations", foreign_keys=[receiver_id])
