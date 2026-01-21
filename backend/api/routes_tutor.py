from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional
import uuid

from backend.agents.tutor_graph import tutor_graph, detect_intent
from backend.services.sarvam_service import SarvamService
from backend.services.video_generator import video_generator
from backend.rag.ingestion import get_retriever
from backend.core.security import get_current_user, User

router = APIRouter(prefix="/tutor", tags=["tutor"])


class TutorSessionRequest(BaseModel):
    topic: str
    generate_audio: bool = False
    language_code: str = "en-IN"
    session_name: str = "default"


class TutorSessionResponse(BaseModel):
    plan: List[str]
    response: str
    mindmap_source: Optional[str] = None
    flashcards: Optional[List[dict]] = None
    audio_base64: Optional[str] = None
    # Video generation fields
    detected_intent: Optional[str] = None
    video_job_id: Optional[str] = None
    video_status: Optional[str] = None


class AudioRequest(BaseModel):
    text: str
    language_code: str = "hi-IN"


class AudioResponse(BaseModel):
    audio_base64: Optional[str]


async def generate_video_task(topic: str, context: str, user_id: str, job_id: str):
    """Background task for video generation"""
    await video_generator.generate_video_lecture(
        topic=topic,
        context=context,
        user_id=user_id,
        job_id=job_id
    )


@router.post("/start_session", response_model=TutorSessionResponse)
async def start_session(
    request: TutorSessionRequest, 
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user)
):
    try:
        # Detect intent first to handle video specially
        intent = detect_intent(request.topic)
        
        # If video intent, start video generation in background
        video_job_id = None
        video_status = None
        
        if intent == "video":
            # Get RAG context for video generation
            context = ""
            try:
                retriever = get_retriever(user_id=str(user.id), session_name=request.session_name)
                docs = retriever.invoke(request.topic)
                if docs:
                    context = "\n\n".join([doc.page_content for doc in docs[:5]])
            except Exception as e:
                print(f"[VIDEO] RAG retrieval error: {e}")
            
            # Create job ID and start background task
            video_job_id = str(uuid.uuid4())[:8]
            video_generator.jobs[video_job_id] = {
                "status": "queued",
                "progress": 0,
                "message": "Video generation queued..."
            }
            
            # Start video generation in background
            background_tasks.add_task(
                generate_video_task,
                topic=request.topic,
                context=context,
                user_id=str(user.id),
                job_id=video_job_id
            )
            
            video_status = "queued"
            print(f"[VIDEO] Started generation job: {video_job_id}")
        
        # Run the tutor graph as normal
        inputs = {
            "user_query": request.topic,
            "user_id": str(user.id),
            "session_name": request.session_name,
            "plan": [],
            "context": "",
            "response": "",
            "generate_audio": request.generate_audio,
            "language_code": request.language_code
        }
        
        result = await tutor_graph.ainvoke(inputs)
        
        return TutorSessionResponse(
            plan=result["plan"],
            response=result["response"],
            mindmap_source=result.get("mindmap_source"),
            flashcards=result.get("flashcards"),
            audio_base64=result.get("audio_base64"),
            detected_intent=intent,
            video_job_id=video_job_id,
            video_status=video_status
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/audio", response_model=AudioResponse)
async def generate_audio_endpoint(request: AudioRequest):
    audio = SarvamService.generate_audio(request.text, request.language_code)
    if not audio:
        raise HTTPException(status_code=500, detail="Failed to generate audio")
    return AudioResponse(audio_base64=audio)
