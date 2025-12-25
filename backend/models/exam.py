from pydantic import BaseModel
from typing import Optional, List

class QuestionMetadata(BaseModel):
    source_file: str    # e.g., "2023_SEE.pdf"
    year: Optional[str] = None
    marks: int
    module: Optional[str] = None
    difficulty: Optional[str] = None

class ExamQuestion(BaseModel):
    text: str
    metadata: QuestionMetadata

class ExamStructure(BaseModel):
    structure_type: str = "unit_wise"
    unit_count: int
    subquestion_labels: List[str]  # e.g. ["a", "b", "c"]
    has_or_choice: bool
    marks_per_subquestion: int

class PlacedQuestion(BaseModel):
    unit_no: int
    main_choice: str            # "A" or "B" (before/after OR)
    sub_label: str              # "a", "b", "c"
    text: str
    marks: int
    source_file: str
    module: str
