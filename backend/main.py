import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine
from app.models import Base
from app.routers import meetings, auth, invitations

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Veyro API",
    description="Backend API for Veyro video conferencing application",
    version="2.0.0",
)

frontend_url = os.getenv(
    "FRONTEND_URL",
    "http://localhost:3000",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        frontend_url,
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(
    auth.router,
    prefix="/api",
)

app.include_router(
    meetings.router,
    prefix="/api",
)

app.include_router(
    invitations.router,
    prefix="/api",
)


@app.get("/")
async def health_check():
    return {
        "status": "ok",
        "app": "Veyro API",
        "schema": "v2",
    }