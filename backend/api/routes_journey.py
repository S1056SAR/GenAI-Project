from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from pydantic import BaseModel
from typing import List, Dict, Optional
import uuid
from backend.agents.journey_graph import journey_agent
from backend.models.journey import JourneyNode, JourneyState
from backend.core.security import get_current_user, User
import os
router = APIRouter()

# In-memory storage: User_ID -> { Course_ID -> JourneyState }
active_journeys: Dict[str, Dict[str, JourneyState]] = {}

class StartJourneyRequest(BaseModel):
    syllabus_text: str

class SubmitQuizRequest(BaseModel):
    course_id: str
    node_id: str
    answers: List[int] # List of chosen indices

@router.post("/start", response_model=JourneyState)
async def start_journey(request: StartJourneyRequest, user: User = Depends(get_current_user)):
    """
    Starts a new learning journey based on syllabus.
    Scopes data to the authenticated user.
    """
    course_id = str(uuid.uuid4())[:8]
    
    # Design Curriculum
    nodes = journey_agent.design_curriculum(request.syllabus_text)
    
    state = JourneyState(
        course_id=course_id,
        syllabus_summary=request.syllabus_text[:200],
        nodes=nodes,
        current_node_index=0
    )
    
    if user.id not in active_journeys:
        active_journeys[user.id] = {}
        
    active_journeys[user.id][course_id] = state
    return state

from fastapi import UploadFile, File
import shutil
import tempfile
from langchain_community.document_loaders import PyPDFLoader
from backend.rag.ingestion import ingest_pathfinder_pdf

@router.post("/start_from_file", response_model=JourneyState)
async def start_journey_from_file(file: UploadFile = File(...), user: User = Depends(get_current_user)):
    """
    Starts journey from uploaded document (PDF/TXT).
    Also ingests PDF into course-scoped RAG for content retrieval.
    """
    # Generate course_id first so we can use it for RAG collection
    course_id = str(uuid.uuid4())[:8]
    
    # Save to temp file (keep for ingestion)
    with tempfile.NamedTemporaryFile(delete=False, suffix=f".{file.filename.split('.')[-1]}") as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name
        
    try:
        text = ""
        if file.filename.endswith(".pdf"):
            # Use PyMuPDF for better parsing
            try:
                import fitz
                doc = fitz.open(tmp_path)
                text = "\n".join([page.get_text("text") for page in doc])
                doc.close()
            except:
                # Fallback to PyPDFLoader
                loader = PyPDFLoader(tmp_path)
                pages = loader.load()
                text = "\n".join([p.page_content for p in pages])
            
            # Ingest PDF into course-scoped RAG collection
            chunk_count = ingest_pathfinder_pdf(course_id, user.id, tmp_path)
            print(f"[PATHFINDER] Ingested {chunk_count} chunks for course {course_id}")
        else:
            with open(tmp_path, "r", encoding="utf-8") as f:
                text = f.read()
                
        # Design curriculum from text
        nodes = journey_agent.design_curriculum(text[:15000])
        
        state = JourneyState(
            course_id=course_id,
            syllabus_summary=f"Generated from {file.filename}",
            nodes=nodes,
            current_node_index=0
        )
        
        if user.id not in active_journeys:
            active_journeys[user.id] = {}
            
        active_journeys[user.id][course_id] = state
        return state
        
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

@router.get("/node/{course_id}/{node_id}")
async def get_node_content(course_id: str, node_id: str, user: User = Depends(get_current_user)):
    """
    Retrieves (or generates) content for a node.
    Uses course-scoped RAG for context retrieval.
    """
    user_journeys = active_journeys.get(user.id)
    if not user_journeys or course_id not in user_journeys:
        raise HTTPException(status_code=404, detail="Journey not found")
        
    state = user_journeys[course_id]
    
    # Find node
    node = next((n for n in state.nodes if n.id == node_id), None)
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
        
    if node.status == "locked":
        raise HTTPException(status_code=403, detail="Node is locked. Complete previous levels first.")
        
    # Generate content if missing
    if not node.content_summary or not node.quiz_questions:
        # Pass course_id and user_id for course-scoped context retrieval
        data = journey_agent.generate_node_content(node.title, course_id=course_id, user_id=user.id)
        node.content_summary = data.get("content_summary", "")
        node.quiz_questions = data.get("quiz_questions", [])
        
    return node

@router.post("/submit_quiz")
async def submit_quiz(request: SubmitQuizRequest, user: User = Depends(get_current_user)):
    """
    Evaluates quiz. If pass (>66%), unlock next node.
    """
    user_journeys = active_journeys.get(user.id)
    if not user_journeys or request.course_id not in user_journeys:
        raise HTTPException(status_code=404, detail="Journey not found")
    
    state = user_journeys[request.course_id]
    node = next((n for n in state.nodes if n.id == request.node_id), None)
    
    if not node:
         raise HTTPException(status_code=404, detail="Node not found")
         
    # Calculate Score
    correct_count = 0
    total = len(node.quiz_questions)
    
    if total == 0:
        return {"result": "pass", "message": "No quiz for this node.", "next_node_id": None}
        
    for i, q in enumerate(node.quiz_questions):
        if i < len(request.answers):
            if request.answers[i] == q.get("correct_answer"):
                correct_count += 1
                
    score_percent = (correct_count / total) * 100
    passed = score_percent >= 66
    
    response = {
        "score": score_percent,
        "correct_count": correct_count,
        "total": total,
        "result": "pass" if passed else "fail"
    }
    
    if passed:
        node.status = "completed"
        response["message"] = "Congratulations! You passed."
        
        # Unlock next node
        next_index = state.current_node_index + 1
        if next_index < len(state.nodes):
            state.nodes[next_index].status = "unlocked"
            state.current_node_index = next_index
            response["next_node_id"] = state.nodes[next_index].id
        else:
            response["message"] = "Course Completed! You represent the pinnacle of learning."
            response["next_node_id"] = None
    else:
        response["message"] = "You didn't pass. Review the material and try again."
        response["next_node_id"] = None
        
    return response
