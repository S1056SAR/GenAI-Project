"""
Video Lecture API Routes
Endpoints for generating educational video lectures
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional
import logging

from backend.core.security import get_current_user, User
from backend.services.video_generator import video_generator
from backend.rag.ingestion import get_retriever

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/video", tags=["Video Lecture"])


class VideoGenerateRequest(BaseModel):
    """Request to generate a video lecture"""
    topic: str
    session_name: Optional[str] = "default"
    use_rag: bool = True


class VideoGenerateResponse(BaseModel):
    """Response with job info"""
    job_id: str
    status: str
    message: str


class VideoStatusResponse(BaseModel):
    """Response with job status"""
    job_id: str
    status: str
    progress: int
    message: str
    video_url: Optional[str] = None
    error: Optional[str] = None


async def generate_video_task(topic: str, context: str, user_id: str, job_id: str):
    """Background task for video generation"""
    await video_generator.generate_video_lecture(
        topic=topic,
        context=context,
        user_id=user_id,
        job_id=job_id
    )


@router.post("/generate", response_model=VideoGenerateResponse)
async def generate_video(
    request: VideoGenerateRequest,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user)
):
    """
    Start video lecture generation.
    
    This returns immediately with a job_id. Use /video/status/{job_id} to check progress.
    """
    try:
        # Get RAG context if enabled
        context = ""
        if request.use_rag:
            try:
                retriever = get_retriever(user_id=user.id, session_name=request.session_name)
                docs = retriever.invoke(request.topic)
                if docs:
                    context = "\n\n".join([doc.page_content for doc in docs[:5]])
            except Exception as e:
                logger.warning(f"RAG retrieval failed: {e}")
        
        # Create job
        import uuid
        job_id = str(uuid.uuid4())[:8]
        
        # Initialize job status
        video_generator.jobs[job_id] = {
            "status": "queued",
            "progress": 0,
            "message": "Video generation queued..."
        }
        
        # Start background task
        background_tasks.add_task(
            generate_video_task,
            topic=request.topic,
            context=context,
            user_id=user.id,
            job_id=job_id
        )
        
        return VideoGenerateResponse(
            job_id=job_id,
            status="queued",
            message="Video generation started. Check status at /video/status/{job_id}"
        )
        
    except Exception as e:
        logger.error(f"Failed to start video generation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status/{job_id}", response_model=VideoStatusResponse)
async def get_video_status(job_id: str, user: User = Depends(get_current_user)):
    """
    Get the status of a video generation job
    """
    status = video_generator.get_job_status(job_id)
    
    if status.get("status") == "not_found":
        raise HTTPException(status_code=404, detail="Job not found")
    
    return VideoStatusResponse(
        job_id=job_id,
        status=status.get("status", "unknown"),
        progress=status.get("progress", 0),
        message=status.get("message", ""),
        video_url=status.get("video_url"),
        error=status.get("error")
    )


@router.get("/health")
async def health_check():
    """Check if Video service is healthy"""
    import os
    return {
        "status": "healthy",
        "service": "Video Lecture Generator",
        "groq_configured": bool(os.getenv("GROQ_API_KEY")),
        "pexels_configured": bool(os.getenv("PEXELS_API_KEY"))
    }
