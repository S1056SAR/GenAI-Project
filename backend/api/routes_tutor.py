from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from backend.agents.tutor_graph import tutor_graph
from backend.services.sarvam_service import SarvamService
from backend.core.security import get_current_user, User

router = APIRouter(prefix="/tutor", tags=["tutor"])

class TutorSessionRequest(BaseModel):
    topic: str
    generate_audio: bool = False
    language_code: str = "en-IN"  # Default English; auto-detected from query by agent
    session_name: str = "default"  # Study session name for context isolation

class TutorSessionResponse(BaseModel):
    plan: List[str]
    response: str
    mindmap_source: Optional[str] = None
    flashcards: Optional[List[dict]] = None
    audio_base64: Optional[str] = None

class AudioRequest(BaseModel):
    text: str
    language_code: str = "hi-IN"

class AudioResponse(BaseModel):
    audio_base64: Optional[str]

@router.post("/start_session", response_model=TutorSessionResponse)
async def start_session(request: TutorSessionRequest, user: User = Depends(get_current_user)):
    try:
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
            audio_base64=result.get("audio_base64")
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/audio", response_model=AudioResponse)
async def generate_audio_endpoint(request: AudioRequest):
    audio = SarvamService.generate_audio(request.text, request.language_code)
    if not audio:
        raise HTTPException(status_code=500, detail="Failed to generate audio")
    return AudioResponse(audio_base64=audio)
