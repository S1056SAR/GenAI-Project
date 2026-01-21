"""
Doubt Solver API Routes
Endpoints for the Chat Doubt Solver feature
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
import logging

from backend.core.security import get_current_user, User
from backend.agents.doubt_solver import solve_doubt

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/doubt", tags=["Doubt Solver"])


class DoubtRequest(BaseModel):
    """Request model for asking a doubt"""
    doubt: str
    session_name: Optional[str] = "default"
    rag_context: Optional[str] = None


class DoubtResponse(BaseModel):
    """Response model for doubt answer"""
    answer: str
    web_search_used: bool = False


@router.post("/ask", response_model=DoubtResponse)
async def ask_doubt(request: DoubtRequest, user=Depends(get_current_user)):
    """
    Ask Vidya Ma'am a doubt about your study materials.
    
    Uses RAG to fetch context from uploaded materials,
    falls back to web search if context is insufficient.
    """
    try:
        answer = await solve_doubt(
            doubt=request.doubt,
            rag_context=request.rag_context,
            user_id=user.id,
            session_name=request.session_name
        )
        
        web_search_used = "web search" in answer.lower() or request.rag_context is None
        
        return DoubtResponse(
            answer=answer,
            web_search_used=web_search_used
        )
    except Exception as e:
        logger.error(f"Error solving doubt: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health_check():
    """Check if Doubt Solver service is healthy"""
    return {
        "status": "healthy",
        "service": "Doubt Solver",
        "llm": "Gemini 3 Flash"
    }
