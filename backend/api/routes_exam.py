from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from pydantic import BaseModel
from typing import List, Optional
from backend.rag.ingestion_exam import ingest_exam_papers
from backend.services.structure_analyzer import analyze_exam_structure
from backend.services.question_selector import build_exam_from_syllabus
from backend.services.pdf_service import PDFService
from backend.models.exam import ExamStructure, PlacedQuestion
from backend.core.security import get_current_user, User
import os

router = APIRouter()

class IngestResponse(BaseModel):
    status: str
    message: str

class GenerateExamRequest(BaseModel):
    syllabus_text: str
    reference_text: Optional[str] = None # Optional override
    subject_filter: Optional[str] = None # e.g. "CS" to only use CS papers

class GenerateExamResponse(BaseModel):
    pdf_path: str
    structure: ExamStructure
    questions: List[PlacedQuestion]

# Hardcoded reference text for context (University Pattern)
DEFAULT_REFERENCE_TEXT = """
CS36 - JAN 2022
Answer any FIVE full questions, selecting ONE full question from each unit.
UNIT - 1
1. a) Define Machine Learning. Explain the steps in designing a learning system. (8 Marks)
   b) Explain the Find-S (Maximally Specific Hypothesis) algorithm with an example. (8 Marks)
   c) Differentiate between Supervised and Unsupervised Learning. (4 Marks)
OR
2. a) Explain the Candidate-Elimination algorithm. (10 Marks)
   b) Write a short note on Inductive Bias. (10 Marks)

UNIT - 2
... (Similar pattern continues)
"""

@router.post("/ingest", response_model=IngestResponse)
async def trigger_ingestion(background_tasks: BackgroundTasks):
    """
    Triggers the background ingestion process for exam papers.
    """
    # Run in background to not block
    background_tasks.add_task(ingest_exam_papers)
    return {"status": "started", "message": "Ingestion started in background. Check logs for progress."}

@router.post("/generate", response_model=GenerateExamResponse)
async def generate_exam(request: GenerateExamRequest, user: User = Depends(get_current_user)):
    """
    Generates a structure-aware mock exam PDF.
    """
    try:
        # 1. Analyze Structure (Learn from pattern)
        ref_text = request.reference_text or DEFAULT_REFERENCE_TEXT
        structure = analyze_exam_structure(ref_text)
        
        # 2. Select Questions (Map syllabus to structure)
        placed_questions = build_exam_from_syllabus(
            request.syllabus_text, 
            structure,
            subject_filter=request.subject_filter,
            user_id=user.id
        )
        
        # 3. Generate PDF
        output_filename = f"EduSynth_Exam_{os.urandom(4).hex()}.pdf"
        pdf_path = PDFService.render_exam_pdf(placed_questions, structure, output_path=output_filename)
        
        return {
            "pdf_path": pdf_path,
            "structure": structure,
            "questions": placed_questions
        }
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
