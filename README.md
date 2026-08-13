# Veyro - Premium Video Conferencing Platform 🎥

Veyro is a modern, high-performance video conferencing application built with Next.js (TypeScript), Vanilla CSS with dark glassmorphism aesthetics, FastAPI (Python), SQLite, and Jitsi Meet integration.

---

## 🌟 Key Features

- ⚡ **Instant Meetings**: One-click instant room creation with auto-generated meeting codes.
- 📅 **Schedule Meetings**: Plan future video meetings with custom titles, descriptions, dates, and durations.
- 🔗 **Direct Joining & Link Sharing**: Join any room via meeting ID or direct URL with custom display names.
- 🎥 **HD Video & Audio Engine**: Powered by Jitsi Meet iframe integration (screen sharing, chat, tile view, raise hand, background blur).
- 🎨 **Glassmorphism Dark Aesthetics**: Built with Vanilla CSS, custom HSL gradients, Google Fonts (`Outfit` & `Inter`), and interactive hover transitions.
- 🗄️ **Persistent Database**: Backend storage powered by FastAPI & SQLAlchemy for meetings and participants history.

---

## 🚀 How to Run the Project

### 1. Start the Backend API (FastAPI)

```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload --port 8000
```
- API Documentation: `http://127.0.0.1:8000/docs`
- Health Check: `http://127.0.0.1:8000/`

### 2. Start the Frontend App (Next.js)

In a separate terminal window:

```bash
cd frontend
npm run dev
```
- Open your browser at: `http://localhost:3000`

---

## 📁 Project Structure

```
Veyro/
├── backend/
│   ├── app/
│   │   ├── database.py      # SQLite database connection & Session Local
│   │   ├── models.py        # SQLAlchemy Meeting & Participant models
│   │   ├── schemas.py       # Pydantic validation schemas
│   │   └── routers/
│   │       └── meetings.py  # Instant, schedule, join, & list endpoints
│   ├── main.py              # FastAPI app initialization & CORS middleware
│   └── requirements.txt     # Python dependencies
└── frontend/
    ├── components/
    │   ├── Button.tsx       # Reusable button component
    │   ├── MeetingCard.tsx  # Upcoming & recent meeting card with copy link
    │   └── Navbar.tsx       # Top navigation header with live clock
    ├── pages/
    │   ├── _app.tsx         # Custom Next.app wrapper
    │   ├── index.tsx        # Dashboard with quick actions & meeting feeds
    │   ├── join.tsx         # Join room by code page
    │   ├── schedule.tsx     # Meeting scheduling form page
    │   └── meeting/[id].tsx # Video room view with Jitsi embed & controls
    └── styles/
        ├── globals.css      # Design system variables & dark theme
        ├── Home.module.css  # Dashboard layout styles
        ├── Forms.module.css # Form card styles
        ├── Meeting.module.css# Video room styles
        └── Components.module.css
```
