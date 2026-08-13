from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List



import hashlib
import datetime as dt
import re

from app.database import get_db
from app.models import User, utcnow
from app.schemas import (
    UserCreate,
    UserLogin,
    GuestLogin,
    UserSync,
    UserResponse,
)

router = APIRouter(
    prefix="/auth",
    tags=["auth"],
)

@router.get("/users")
def list_users(
    exclude_id: int | None = None,
    db: Session = Depends(get_db),
):
    query = (
        db.query(User)
        .filter(
            User.is_active.is_(True),
            User.is_guest.is_(False),
        )
        .order_by(User.name.asc())
    )

    if exclude_id is not None:
        query = query.filter(
            User.id != exclude_id
        )

    users = query.all()

    return [
        {
            "id": user.id,
            "name": user.name,
            "username": user.username,
            "email": user.email,
        }
        for user in users
    ]



def hash_password(password: str) -> str:
    return hashlib.sha256(
        password.encode("utf-8")
    ).hexdigest()

 

def make_username(
    name: str,
    db: Session,
) -> str:

    base = (
        re.sub(
            r"[^a-zA-Z0-9_]+",
            "",
            name.lower(),
        )
        or "user"
    )

    base = base[:42]

    candidate = base
    counter = 1

    while (
        db.query(User)
        .filter(User.username == candidate)
        .first()
    ):
        counter += 1
        candidate = f"{base}{counter}"

    return candidate[:50]

 

@router.post(
    "/sync",
    response_model=UserResponse,
)
def sync_firebase_user(
    user_in: UserSync,
    db: Session = Depends(get_db),
):

    firebase_uid = (
        user_in.firebase_uid.strip()
    )

    if not firebase_uid:
        raise HTTPException(
            status_code=400,
            detail="Firebase UID is required.",
        )
 

    existing = (
        db.query(User)
        .filter(
            User.firebase_uid
            == firebase_uid
        )
        .first()
    )
 
    email = (
        str(user_in.email)
        .lower()
        .strip()
        if user_in.email
        else f"guest_{firebase_uid}@veyro.local"
    )
 

    requested_username = (
        user_in.username.strip().lower()
        if user_in.username
        else None
    )
 

    if existing:

        existing.name = (
            user_in.name.strip()
        )

        existing.is_guest = (
            user_in.is_guest
        )

        existing.is_active = True
        existing.email = email

    
        if requested_username:

            username_owner = (
                db.query(User)
                .filter(
                    User.username
                    == requested_username,
                    User.id != existing.id,
                )
                .first()
            )

            if username_owner:
                raise HTTPException(
                    status_code=409,
                    detail="Username is already taken.",
                )

            existing.username = (
                requested_username
            )

        existing.updated_at = utcnow()

        db.commit()
        db.refresh(existing)

        return existing


         

    email_owner = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if email_owner:


        if (
            email_owner.firebase_uid is None
            or email_owner.firebase_uid
            == firebase_uid
        ):
            email_owner.firebase_uid = (
                firebase_uid
            )

            email_owner.name = (
                user_in.name.strip()
            )

            email_owner.is_guest = (
                user_in.is_guest
            )

            email_owner.is_active = True
            email_owner.updated_at = utcnow()

            if requested_username:

                username_owner = (
                    db.query(User)
                    .filter(
                        User.username
                        == requested_username,
                        User.id != email_owner.id,
                    )
                    .first()
                )

                if username_owner:
                    raise HTTPException(
                        status_code=409,
                        detail="Username is already taken.",
                    )

                email_owner.username = (
                    requested_username
                )

            db.commit()
            db.refresh(email_owner)

            return email_owner

        raise HTTPException(
            status_code=409,
            detail="This email is already linked to another account.",
        )

    # ----------------------------------------------
    # Determine username for new user
    # ----------------------------------------------

    if requested_username:

        username_exists = (
            db.query(User)
            .filter(
                User.username
                == requested_username
            )
            .first()
        )

        if username_exists:
            username = make_username(
                user_in.name,
                db,
            )
        else:
            username = requested_username

    else:

        username = make_username(
            user_in.name,
            db,
        )

    # ----------------------------------------------
    # Create new SQLite user
    # ----------------------------------------------

    user = User(
        name=user_in.name.strip(),
        username=username,
        email=email,
        firebase_uid=firebase_uid,
        password_hash="firebase_managed",
        is_guest=user_in.is_guest,
        is_active=True,
        created_at=utcnow(),
        updated_at=utcnow(),
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user


# --------------------------------------------------
# Traditional email/password signup
# --------------------------------------------------
 # add this import near the top of auth.py

@router.get("/users/search")
def search_users(
    username: str,
    exclude_id: int | None = None,
    db: Session = Depends(get_db),
):
    query = username.strip().lower()

    if len(query) < 2:
        return []

    db_query = (
        db.query(User)
        .filter(
            User.is_active.is_(True),
            User.is_guest.is_(False),
            or_(
                User.username.ilike(f"%{query}%"),
                User.name.ilike(f"%{query}%"),
            ),
        )
    )

    if exclude_id is not None:
        db_query = db_query.filter(
            User.id != exclude_id
        )

    users = (
        db_query
        .order_by(User.username.asc())
        .limit(10)
        .all()
    )

    return [
        {
            "id": user.id,
            "name": user.name,
            "username": user.username,
        }
        for user in users
    ]
 

@router.post(
    "/signup",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def signup(
    user_in: UserCreate,
    db: Session = Depends(get_db),
):

    email = (
        str(user_in.email)
        .lower()
        .strip()
    )

    existing = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=400,
            detail=(
                "An account with this email "
                "address already exists."
            ),
        )

    username = (
        user_in.username.strip().lower()
        if user_in.username
        else make_username(
            user_in.name,
            db,
        )
    )

    if (
        db.query(User)
        .filter(
            User.username == username
        )
        .first()
    ):
        raise HTTPException(
            status_code=400,
            detail="Username is already taken.",
        )

    user = User(
        name=user_in.name.strip(),
        username=username,
        email=email,
        password_hash=hash_password(
            user_in.password
        ),
        firebase_uid=None,
        is_guest=False,
        is_active=True,
        created_at=utcnow(),
        updated_at=utcnow(),
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user


# --------------------------------------------------
# Email/password login
# --------------------------------------------------

@router.post(
    "/login",
    response_model=UserResponse,
)
def login(
    credentials: UserLogin,
    db: Session = Depends(get_db),
):

    email = (
        str(credentials.email)
        .lower()
        .strip()
    )

    user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if (
        not user
        or user.password_hash
        != hash_password(
            credentials.password
        )
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=403,
            detail="Account is inactive.",
        )

    return user


# --------------------------------------------------
# Guest login
# --------------------------------------------------

@router.post(
    "/guest",
    response_model=UserResponse,
)
def continue_as_guest(
    guest_in: GuestLogin,
    db: Session = Depends(get_db),
):

    display_name = (
        guest_in.name.strip()
        or "Guest User"
    )

    username = (
        guest_in.username.strip().lower()
        if guest_in.username
        else make_username(
            display_name,
            db,
        )
    )

    if (
        db.query(User)
        .filter(
            User.username == username
        )
        .first()
    ):
        username = make_username(
            display_name,
            db,
        )

    guest_email = (
        "guest_"
        + str(
            dt.datetime.now(
                dt.timezone.utc
            ).timestamp()
        )
        + "@veyro.local"
    )

    user = User(
        name=display_name,
        username=username,
        email=guest_email,
        password_hash="guest_no_password",
        firebase_uid=None,
        is_guest=True,
        is_active=True,
        created_at=utcnow(),
        updated_at=utcnow(),
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user