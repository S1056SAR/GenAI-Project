import json
import os
from langchain_core.messages import HumanMessage
from backend.core.llm import get_llm
from backend.models.exam import ExamStructure

CACHE_FILE = "data/exam_structure_cache.json"

def analyze_exam_structure(reference_text: str) -> ExamStructure:
    """
    Analyzes reference exam text to determine the structure.
    Uses caching to avoid re-analysis.
    """
    if os.path.exists(CACHE_FILE):
        print(f"Loading cached exam structure from {CACHE_FILE}")
        with open(CACHE_FILE, "r") as f:
            data = json.load(f)
            return ExamStructure(**data)
            
    print("Analyzing reference exam structure with LLM...")
    llm = get_llm(mode="smart") # Use smart model for analysis
    
    prompt = f"""
    Analyze the structure of this exam paper text.
    
    Determine:
    1. "unit_count": Total number of modules/units (e.g. 5).
    2. "subquestion_labels": List of labels used for sub-questions (e.g. ["a", "b", "c"] or ["1", "2"]).
    3. "has_or_choice": Boolean, true if there is an "OR" choice between main questions in a unit.
    4. "marks_per_subquestion": Typical marks for one sub-question (e.g. 5, 8, 10). Estimate an average if varied.
    
    Return VALID JSON matching this schema:
    {{
      "structure_type": "unit_wise",
      "unit_count": int,
      "subquestion_labels": [str],
      "has_or_choice": bool,
      "marks_per_subquestion": int
    }}
    
    Reference Text:
    {reference_text[:5000]}
    """
    
    try:
        response = llm.invoke([HumanMessage(content=prompt)])
        content = response.content
        
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        elif "```" in content:
            content = content.split("```")[1].split("```")[0]
            
        data = json.loads(content)
        structure = ExamStructure(**data)
        
        # Cache it
        os.makedirs(os.path.dirname(CACHE_FILE), exist_ok=True)
        with open(CACHE_FILE, "w") as f:
            f.write(structure.model_dump_json())
            
        return structure
        
    except Exception as e:
        print(f"Structure analysis failed: {e}")
        # Fallback to standard university pattern
        return ExamStructure(
            structure_type="unit_wise",
            unit_count=5,
            subquestion_labels=["a", "b", "c"],
            has_or_choice=True,
            marks_per_subquestion=7
        )
