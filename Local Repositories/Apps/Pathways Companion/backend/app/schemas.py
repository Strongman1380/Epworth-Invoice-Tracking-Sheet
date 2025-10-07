from datetime import datetime, date
from typing import List, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field


EmotionTag = Literal["Calm", "Awareness", "Hope", "Guilt", "Anger", "Frustrated", "Ashamed", "Relief", "Proud"]
UserRole = Literal["participant", "facilitator", "admin"]


class ReflectionCreate(BaseModel):
    promptId: str = Field(..., alias="promptId")
    body: str
    emotions: List[EmotionTag] = []
    insights: Optional[str] = ""
    facilitatorVisible: bool = Field(default=False, alias="facilitatorVisible")
    voiceNoteUrl: Optional[str] = Field(default=None, alias="voiceNoteUrl")
    voiceNoteDuration: Optional[int] = Field(default=None, alias="voiceNoteDuration")
    createdAt: datetime = Field(default_factory=datetime.utcnow, alias="createdAt")
    userId: str = Field(default="demo-user", alias="userId")

    class Config:
        allow_population_by_field_name = True


class ReflectionResponse(BaseModel):
    id: UUID | int  # Support both UUID (Supabase) and int (JSON storage)
    userId: str
    promptId: str
    body: str
    emotions: List[EmotionTag]
    insights: Optional[str]
    facilitatorVisible: bool = False
    voiceNoteUrl: Optional[str] = None
    voiceNoteTranscript: Optional[str] = None
    aiFeedback: Optional[str] = None
    createdAt: datetime


class TrendPoint(BaseModel):
    emotion: EmotionTag
    count: int


class TrendResponse(BaseModel):
    userId: str
    trend: List[TrendPoint]
    windowDays: int = 7


class BehaviorCreate(BaseModel):
    date: date
    trigger: Optional[str] = None
    response: Optional[str] = None
    intensityLevel: int = Field(..., ge=1, le=10, alias="intensityLevel")
    outcome: Optional[str] = None
    replacementPractice: Optional[str] = Field(default=None, alias="replacementPractice")

    class Config:
        allow_population_by_field_name = True


class BehaviorResponse(BaseModel):
    id: UUID
    userId: str
    date: date
    trigger: Optional[str]
    response: Optional[str]
    intensityLevel: int
    outcome: Optional[str]
    replacementPractice: Optional[str]
    createdAt: datetime


class WheelProgressCreate(BaseModel):
    segmentName: str = Field(..., alias="segmentName")
    wheelType: Literal["power_control", "equality"] = Field(..., alias="wheelType")
    completed: bool = False
    quizScore: Optional[int] = Field(default=None, alias="quizScore")
    notes: Optional[str] = None

    class Config:
        allow_population_by_field_name = True


class WheelProgressResponse(BaseModel):
    id: UUID
    userId: str
    segmentName: str
    wheelType: Literal["power_control", "equality"]
    completed: bool
    quizScore: Optional[int]
    notes: Optional[str]
    timestamp: datetime


class CrisisLogCreate(BaseModel):
    crisisType: str = Field(..., alias="crisisType")
    resourceAccessed: Optional[str] = Field(default=None, alias="resourceAccessed")
    resolved: bool = False

    class Config:
        allow_population_by_field_name = True


class CrisisLogResponse(BaseModel):
    id: UUID
    userId: str
    crisisType: str
    resourceAccessed: Optional[str]
    resolved: bool
    timestamp: datetime


class ProfileResponse(BaseModel):
    id: UUID
    displayName: Optional[str]
    participantId: Optional[str]
    role: UserRole
    facilitatorId: Optional[UUID]
    programStartDate: Optional[date]
    createdAt: datetime
