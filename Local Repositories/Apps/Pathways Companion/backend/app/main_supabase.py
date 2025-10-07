"""
FastAPI backend with Supabase integration for Pathways Companion.
This is the upgraded version using PostgreSQL via Supabase instead of JSON storage.
"""
from datetime import datetime, timedelta
from typing import List, Optional
from uuid import UUID

from fastapi import FastAPI, HTTPException, Header, status
from fastapi.middleware.cors import CORSMiddleware

from .schemas import (
    ReflectionCreate,
    ReflectionResponse,
    TrendPoint,
    TrendResponse,
)
from .supabase_client import get_supabase_client

app = FastAPI(
    title="Pathways Companion API (Supabase)",
    version="0.2.0",
    description="Production-ready API for Daily Reflection Journal with Supabase backend.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_user_from_token(authorization: Optional[str]) -> str:
    """
    Extract and validate user ID from JWT token.

    Args:
        authorization: Bearer token from Authorization header

    Returns:
        User ID string

    Raises:
        HTTPException: If token is missing or invalid
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization header"
        )

    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header format"
        )

    token = authorization[7:]  # Remove "Bearer " prefix

    try:
        supabase = get_supabase_client()
        user_response = supabase.auth.get_user(token)

        if not user_response or not user_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token"
            )

        return str(user_response.user.id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)}"
        )


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {
        "status": "ok",
        "version": "0.2.0",
        "storage": "supabase"
    }


@app.post("/api/reflections", response_model=ReflectionResponse, status_code=201)
def create_reflection(
    reflection: ReflectionCreate,
    authorization: Optional[str] = Header(None)
):
    """
    Create a new reflection entry.

    Requires authentication via Bearer token.
    """
    user_id = get_user_from_token(authorization)
    supabase = get_supabase_client()

    # Limit emotions to 3
    emotions = reflection.emotions[:3] if reflection.emotions else []

    try:
        # Insert reflection into Supabase
        response = supabase.table("reflections").insert({
            "user_id": user_id,
            "prompt_id": reflection.promptId,
            "body": reflection.body,
            "emotions": emotions,
            "insights": reflection.insights,
        }).execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create reflection"
            )

        data = response.data[0]

        return ReflectionResponse(
            id=data["id"],
            userId=data["user_id"],
            promptId=data["prompt_id"],
            body=data["body"],
            emotions=data["emotions"] or [],
            insights=data.get("insights"),
            createdAt=datetime.fromisoformat(data["created_at"].replace("Z", "+00:00")),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )


@app.get("/api/reflections/{user_id}/trend", response_model=TrendResponse)
def get_trend(
    user_id: str,
    authorization: Optional[str] = Header(None),
    days: int = 7
):
    """
    Get emotion trend for a user over the last N days.

    Users can only access their own trends.
    """
    authenticated_user_id = get_user_from_token(authorization)

    # Ensure user can only access their own data
    if authenticated_user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot access other users' data"
        )

    supabase = get_supabase_client()

    try:
        # Use the helper function from the database
        response = supabase.rpc(
            "get_emotion_trend",
            {"p_user_id": user_id, "p_days": days}
        ).execute()

        if response.data:
            trend = [
                TrendPoint(emotion=row["emotion"], count=row["count"])
                for row in response.data
            ]
        else:
            # Fallback to default trends if no data
            trend = [
                TrendPoint(emotion="Calm", count=3),
                TrendPoint(emotion="Awareness", count=2),
                TrendPoint(emotion="Hope", count=2),
            ]

        return TrendResponse(userId=user_id, trend=trend)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch trends: {str(e)}"
        )


@app.get("/api/reflections", response_model=List[ReflectionResponse])
def list_reflections(
    authorization: Optional[str] = Header(None),
    limit: int = 20,
    offset: int = 0
):
    """
    List reflections for the authenticated user.

    Returns most recent reflections first.
    """
    user_id = get_user_from_token(authorization)
    supabase = get_supabase_client()

    try:
        response = supabase.table("reflections")\
            .select("*")\
            .eq("user_id", user_id)\
            .order("created_at", desc=True)\
            .range(offset, offset + limit - 1)\
            .execute()

        reflections = [
            ReflectionResponse(
                id=item["id"],
                userId=item["user_id"],
                promptId=item["prompt_id"],
                body=item["body"],
                emotions=item["emotions"] or [],
                insights=item.get("insights"),
                createdAt=datetime.fromisoformat(item["created_at"].replace("Z", "+00:00")),
            )
            for item in response.data
        ]

        return reflections
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch reflections: {str(e)}"
        )


@app.get("/api/reflections/{reflection_id}", response_model=ReflectionResponse)
def get_reflection(
    reflection_id: UUID,
    authorization: Optional[str] = Header(None)
):
    """
    Get a specific reflection by ID.

    Users can only access their own reflections.
    """
    user_id = get_user_from_token(authorization)
    supabase = get_supabase_client()

    try:
        response = supabase.table("reflections")\
            .select("*")\
            .eq("id", str(reflection_id))\
            .eq("user_id", user_id)\
            .execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Reflection not found"
            )

        data = response.data[0]

        return ReflectionResponse(
            id=data["id"],
            userId=data["user_id"],
            promptId=data["prompt_id"],
            body=data["body"],
            emotions=data["emotions"] or [],
            insights=data.get("insights"),
            createdAt=datetime.fromisoformat(data["created_at"].replace("Z", "+00:00")),
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch reflection: {str(e)}"
        )


@app.delete("/api/reflections/{reflection_id}", status_code=204)
def delete_reflection(
    reflection_id: UUID,
    authorization: Optional[str] = Header(None)
):
    """
    Delete a reflection.

    Users can only delete their own reflections.
    """
    user_id = get_user_from_token(authorization)
    supabase = get_supabase_client()

    try:
        response = supabase.table("reflections")\
            .delete()\
            .eq("id", str(reflection_id))\
            .eq("user_id", user_id)\
            .execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Reflection not found or already deleted"
            )

        return None
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete reflection: {str(e)}"
        )
