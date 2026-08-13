# Veyro — Video Conferencing Platform

> Full-stack video conferencing platform built with Next.js, React, TypeScript, FastAPI, SQLAlchemy, SQLite, Firebase Authentication, and a self-hosted Jitsi Meet infrastructure.

**Live App:** https://veyro-three.vercel.app  
**Backend API:** https://veyro.onrender.com  
**Swagger / OpenAPI:** https://veyro.onrender.com/docs  
**Jitsi Server:** https://meet.madhav.cloud

## Features

- Firebase Authentication with email/password and guest access
- User profiles with name, email, and unique username
- Firebase-to-SQLite user synchronization
- Instant meetings with automatically generated room codes
- Scheduled meetings
- Join meetings by meeting code
- Upcoming and recent meeting history
- Username-based user search
- Invite users directly using `@username`
- Meeting invitations with sender/receiver relationships and status
- Participant registration
- Shareable meeting links
- Profile dropdown with account details, invitations, and logout
- Self-hosted Jitsi audio/video meetings
- Microphone, camera, hang-up, and tile-view controls
- Custom Veyro meeting interface
- Responsive dashboard and meeting UI
- Toast notifications and loading states

## Technology Stack

### Frontend
- **Next.js 13.5.6**
- **React 18.2.0**
- **TypeScript 5.2.2**
- **Firebase Web SDK**
- **CSS Modules**
- **Jitsi Meet External API**

### Backend
- **Python**
- **FastAPI**
- **Uvicorn**
- **SQLAlchemy**
- **Pydantic**
- **email-validator**
- **Alembic**
- **SQLite**

### Infrastructure / DevOps
- **AWS EC2** — hosts the self-hosted Jitsi deployment
- **Docker / Docker Compose** — Jitsi containerized infrastructure
- **Jitsi Web, Jicofo, Jitsi Videobridge, Prosody**
- **Nginx** — Jitsi web layer
- **Let's Encrypt** — HTTPS/TLS
- **Vercel** — frontend deployment
- **Render** — backend deployment
- **Git / GitHub** — source control
- **Swagger / OpenAPI** — API documentation and testing
- **WebRTC** — real-time audio/video transport

## Architecture

```text
Next.js + React + TypeScript
            │
            │ REST / JSON
            ▼
      FastAPI Backend
            │
            ▼
      SQLAlchemy + SQLite
            │
      ┌─────┼─────────┐
      ▼     ▼         ▼
    Users Meetings Invitations
            │
            ▼
     Veyro Meeting Page
            │
            │ Jitsi External API
            ▼
    Self-Hosted Jitsi Meet
     ├── Web
     ├── Jicofo
     ├── JVB
     └── Prosody
```

## Database

SQLite is the application's relational database.

### Main tables

| Table | Purpose |
|---|---|
| `users` | User identity, username, email, Firebase UID and account state |
| `meetings` | Meeting metadata, room code, schedule and host |
| `meeting_participants` | User/meeting relationships, roles and join/leave data |
| `invitations` | Meeting invitations, sender, receiver, status and expiry |

The schema uses foreign-key relationships between users, meetings, participants, and invitations.

## API

FastAPI exposes REST endpoints under `/api`.

### Authentication
```text
POST /api/auth/sync
POST /api/auth/signup
POST /api/auth/login
POST /api/auth/guest
GET  /api/auth/users/search
```

### Meetings
```text
POST   /api/meetings/instant
POST   /api/meetings/schedule
GET    /api/meetings/upcoming
GET    /api/meetings/recent
GET    /api/meetings/{meeting_id}
POST   /api/meetings/{meeting_id}/join
POST   /api/meetings/{room_code}/leave
PATCH  /api/meetings/{room_code}/end
DELETE /api/meetings/{meeting_id}
```

### Invitations
```text
POST  /api/invitations
GET   /api/invitations/user/{user_id}
GET   /api/invitations/received/{user_id}
GET   /api/invitations/sent/{user_id}
PATCH /api/invitations/{invitation_id}
```

Swagger:

**https://veyro.onrender.com/docs**

## Meeting Flow

```text
New Instant Meeting
        ↓
FastAPI creates meeting
        ↓
Unique room code generated
        ↓
Veyro opens /meeting/{room_code}
        ↓
Meeting data + participant registration
        ↓
Jitsi External API
        ↓
Video / Audio Conference
```

### Invitation Flow

```text
Invite
  ↓
Create meeting
  ↓
Search @username
  ↓
Select user
  ↓
Send invitation
  ↓
Invitation stored in SQLite
  ↓
Recipient sees invitation
  ↓
Recipient joins meeting
```

## Local Setup

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Backend: `http://127.0.0.1:8000`  
Swagger: `http://127.0.0.1:8000/docs`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend: `http://localhost:3000`

### Frontend environment variables

```env
NEXT_PUBLIC_API_BASE=http://127.0.0.1:8000

NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

## Deployment

- **Frontend:** Vercel
- **Backend:** Render
- **Jitsi:** Docker Compose on AWS EC2
- **HTTPS:** Let's Encrypt
- **Repository:** GitHub

## Project Structure

```text
Veyro/
├── backend/
│   ├── app/
│   │   ├── routers/
│   │   │   ├── auth.py
│   │   │   ├── meetings.py
│   │   │   └── invitations.py
│   │   ├── database.py
│   │   ├── models.py
│   │   └── schemas.py
│   ├── main.py
│   └── requirements.txt
│
├── frontend/
│   ├── components/
│   ├── context/
│   ├── lib/
│   ├── pages/
│   └── styles/
│
├── README.md
└── .gitignore
```

## Future Improvements

- PostgreSQL migration
- Stronger backend authorization
- Host/co-host controls
- Waiting rooms and meeting passwords
- Richer notifications and email invitations
- Calendar integration
- Meeting analytics and recording
- Automated tests and CI/CD
- Further UI and accessibility improvements

## Author

**Madhav Pruthi**

Veyro — Video Conferencing Platform
