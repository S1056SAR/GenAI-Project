from pydantic import BaseModel
from typing import List, Dict, Optional

class JourneyNode(BaseModel):
    id: str                 # e.g., "node_1"
    title: str              # e.g., "Introduction to Pointers"
    description: str
    status: str             # "locked", "unlocked", "completed"
    content_summary: str = ""    # The "Teach" part
    quiz_questions: List[Dict] = [] # The "Test" part

class JourneyState(BaseModel):
    course_id: str
    syllabus_summary: str
    nodes: List[JourneyNode]
    current_node_index: int = 0
