from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    username: Optional[str] = Field(default=None, min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class GuestLogin(BaseModel):
    name: str = Field(default="Guest User", min_length=1, max_length=120)
    username: Optional[str] = Field(default=None, min_length=3, max_length=50)

class UserSync(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    username: Optional[str] = Field(default=None, min_length=3, max_length=50)
    email: Optional[EmailStr] = None
    firebase_uid: str = Field(min_length=1, max_length=128)
    is_guest: bool = False

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    username: str
    email: EmailStr
    is_guest: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime


class ParticipantCreate(BaseModel):
    user_id: int
    role: str = Field(default="participant", pattern="^(host|participant)$")


class ParticipantResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    meeting_id: int
    user_id: int
    role: str
    joined_at: datetime
    left_at: Optional[datetime] = None


class MeetingCreate(BaseModel):
    title: str = Field(default="Instant Meeting", max_length=200)
    description: Optional[str] = None
    start_time: Optional[datetime] = None
    duration_minutes: int = Field(default=60, gt=0, le=1440)
    host_id: int
    meeting_type: str = Field(default="instant", pattern="^(instant|scheduled)$")


class MeetingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    room_code: str
    title: str
    description: Optional[str]
    meeting_type: str
    status: str
    start_time: datetime
    duration_minutes: int
    host_id: int
    created_at: datetime
    updated_at: datetime
    participants: List[ParticipantResponse] = []


# --------------------------------------------------
# Invitation Schemas
# --------------------------------------------------

class InvitationCreate(BaseModel):
    meeting_id: int
    sender_id: int
    receiver_id: int


class InvitationStatusUpdate(BaseModel):
    user_id: int
    status: str = Field(
        pattern="^(accepted|declined|cancelled)$"
    )


class InvitationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int

    meeting_id: int
    room_code: str
    meeting_title: str

    sender_id: int
    sender_name: str
    sender_username: str

    receiver_id: int
    receiver_name: str
    receiver_username: str

    status: str

    created_at: datetime
    expires_at: datetime
    responded_at: Optional[datetime] = None