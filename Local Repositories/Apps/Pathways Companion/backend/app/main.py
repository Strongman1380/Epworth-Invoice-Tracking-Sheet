from datetime import datetime, timedelta
from typing import List

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from .schemas import (
    EmotionTag,
    ReflectionCreate,
    ReflectionResponse,
    TrendPoint,
    TrendResponse,
)
from .storage import load_reflections, save_reflections

app = FastAPI(
    title="Pathways Companion API",
    version="0.1.0",
    description="Prototype API for the Daily Reflection Journal vertical slice.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


_reflections: List[ReflectionResponse] = load_reflections()


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post("/api/reflections", response_model=ReflectionResponse, status_code=201)
def create_reflection(reflection: ReflectionCreate):
    new_id = _reflections[-1].id + 1 if _reflections else 1
    stored = ReflectionResponse(
        id=new_id,
        userId=reflection.userId,
        promptId=reflection.promptId,
        body=reflection.body,
        emotions=reflection.emotions[:3],
        insights=reflection.insights,
        createdAt=reflection.createdAt,
    )
    _reflections.append(stored)
    save_reflections(_reflections)
    return stored


@app.get("/api/reflections/{user_id}/trend", response_model=TrendResponse)
def get_trend(user_id: str):
    window = datetime.utcnow() - timedelta(days=7)
    relevant = [item for item in _reflections if item.userId == user_id and item.createdAt >= window]
    if not relevant:
        return TrendResponse(
            userId=user_id,
            trend=[
                TrendPoint(emotion="Calm", count=3),
                TrendPoint(emotion="Awareness", count=2),
                TrendPoint(emotion="Hope", count=2),
                TrendPoint(emotion="Anger", count=1),
            ],
        )

    counts = {}
    for item in relevant:
        for emotion in item.emotions:
            counts[emotion] = counts.get(emotion, 0) + 1

    trend = [TrendPoint(emotion=emotion, count=count) for emotion, count in sorted(counts.items())]

    return TrendResponse(userId=user_id, trend=trend)


# Serve the web app
app.mount("/", StaticFiles(directory="dist", html=True), name="static")
