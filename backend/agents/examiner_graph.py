"""
EduSynth Examiner Agent - LangGraph Implementation
===================================================
A multi-node agentic workflow for intelligent exam generation with:
- Syllabus analysis and blueprint creation
- Semantic question selection from exam bank
- Structure-aware exam assembly
"""

from typing import TypedDict, List, Dict, Any
from langgraph.graph import StateGraph, END
from langchain_core.messages import SystemMessage, HumanMessage
from backend.core.llm import get_llm
from backend.rag.ingestion_exam import get_exam_vector_store
from backend.models.exam import ExamQuestion, QuestionMetadata
import json
import re


# =============================================================================
# STATE DEFINITION
# =============================================================================

class ExaminerState(TypedDict):
    """
    Shared state across all nodes in the examiner workflow.
    """
    # Input
    syllabus_text: str
    
    # Processing Results
    blueprint: List[Dict[str, Any]]  # [{"module": "Mod1", "marks": 20, "topics": [...]}]
    selected_questions: List[ExamQuestion]
    
    # Output
    final_exam_structure: Dict[str, Any]


# =============================================================================
# AGENT NODES
# =============================================================================

def blueprint_node(state: ExaminerState) -> dict:
    """
    NODE 1: Blueprint Architect
    ===========================
    Role: Analyze syllabus and create an exam blueprint with module-wise
    mark distribution and key topics to cover.
    
    Uses smart LLM for accurate syllabus analysis.
    """
    print("=" * 60)
    print("[BLUEPRINT ARCHITECT NODE]")
    print("=" * 60)
    
    llm = get_llm(mode="smart")
    syllabus = state["syllabus_text"]
    
    system_prompt = """You are an expert exam paper designer with 20 years of experience.
Your task is to analyze a syllabus and create a structured exam blueprint.

OUTPUT REQUIREMENTS:
1. Identify 4-5 major modules/units from the syllabus
2. Assign mark weightage to each (total must be 100 marks)
3. List 2-3 key topics per module that should be tested
4. Higher weightage for more complex/important modules

OUTPUT FORMAT (JSON only, no explanation):
```json
[
  {
    "module": "Module Name",
    "marks": 25,
    "topics": ["Topic 1", "Topic 2", "Topic 3"]
  },
  ...
]
```

RULES:
- Total marks MUST equal 100
- Each module should have 15-30 marks
- Include 4-5 modules total
- Topics should be specific and testable"""

    user_prompt = f"""Analyze this syllabus and create an exam blueprint:

SYLLABUS:
{syllabus[:6000]}

Generate the JSON blueprint now:"""

    try:
        response = llm.invoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt)
        ])
        content = response.content
        
        # Robust JSON extraction
        json_match = re.search(r"```json\n(.*?)```", content, re.DOTALL)
        if json_match:
            content = json_match.group(1)
        else:
            # Try to find JSON array directly
            array_match = re.search(r"\[.*\]", content, re.DOTALL)
            if array_match:
                content = array_match.group(0)
        
        # Clean and parse
        content = content.strip()
        content = re.sub(r"[\x00-\x1f\x7f-\x9f]", "", content)  # Remove control chars
        blueprint = json.loads(content)
        
        # Validate
        if not isinstance(blueprint, list) or len(blueprint) == 0:
            raise ValueError("Invalid blueprint structure")
        
        print(f"   Generated {len(blueprint)} modules")
        for item in blueprint:
            print(f"   - {item.get('module', 'Unknown')}: {item.get('marks', 0)} marks")
        
    except Exception as e:
        print(f"   Blueprint generation failed: {e}")
        # Smart fallback based on syllabus analysis
        blueprint = [
            {"module": "Core Concepts", "marks": 30, "topics": ["Fundamentals", "Definitions"]},
            {"module": "Applications", "marks": 25, "topics": ["Practical applications"]},
            {"module": "Advanced Topics", "marks": 25, "topics": ["Complex concepts"]},
            {"module": "Problem Solving", "marks": 20, "topics": ["Numerical problems"]}
        ]
        print("   Using fallback blueprint")
    
    return {"blueprint": blueprint}


def selector_node(state: ExaminerState) -> dict:
    """
    NODE 2: Question Selector
    =========================
    Role: Select appropriate questions from the exam bank based on
    the blueprint. Uses semantic search to find relevant questions.
    
    Matching Strategy:
    - Search by module name + topics
    - Respect mark allocation
    - Ensure variety in question types
    """
    print("=" * 60)
    print("[QUESTION SELECTOR NODE]")
    print("=" * 60)
    
    vector_store = get_exam_vector_store()
    blueprint = state["blueprint"]
    selected_questions = []
    used_question_hashes = set()  # Track to avoid duplicates
    
    for item in blueprint:
        module = item.get("module", "General")
        target_marks = item.get("marks", 20)
        topics = item.get("topics", [module])
        current_marks = 0
        
        print(f"\n   Module: {module} (Target: {target_marks} marks)")
        
        # Build search query from module + topics
        search_queries = [module] + topics
        
        for query in search_queries:
            if current_marks >= target_marks:
                break
            
            # Semantic search
            try:
                docs = vector_store.similarity_search(query, k=5)
            except Exception as e:
                print(f"   Search error for '{query}': {e}")
                continue
            
            for doc in docs:
                if current_marks >= target_marks:
                    break
                
                # Avoid duplicates
                q_hash = hash(doc.page_content[:100])
                if q_hash in used_question_hashes:
                    continue
                used_question_hashes.add(q_hash)
                
                q_marks = doc.metadata.get("marks", 5)
                
                # Don't exceed target marks by too much
                if current_marks + q_marks > target_marks + 5:
                    continue
                
                # Create question object
                question = ExamQuestion(
                    text=doc.page_content,
                    metadata=QuestionMetadata(
                        source_file=doc.metadata.get("source_file", "Unknown"),
                        year=str(doc.metadata.get("year", "2023")),
                        marks=q_marks,
                        module=doc.metadata.get("module", module),
                        difficulty=doc.metadata.get("difficulty", "Medium")
                    )
                )
                
                selected_questions.append(question)
                current_marks += q_marks
                print(f"      + Selected: {doc.page_content[:50]}... ({q_marks} marks)")
        
        print(f"   Module total: {current_marks}/{target_marks} marks")
    
    print(f"\n   Total questions selected: {len(selected_questions)}")
    return {"selected_questions": selected_questions}


def assembler_node(state: ExaminerState) -> dict:
    """
    NODE 3: Exam Assembler
    ======================
    Role: Organize selected questions into a proper exam structure
    with parts (A, B, C) based on marks and difficulty.
    
    Structure:
    - Part A: Short questions (1-5 marks) - Testing recall
    - Part B: Medium questions (6-10 marks) - Testing understanding
    - Part C: Long questions (11+ marks) - Testing application
    """
    print("=" * 60)
    print("[EXAM ASSEMBLER NODE]")
    print("=" * 60)
    
    questions = state["selected_questions"]
    
    # Categorize by marks
    part_a = []  # Short answer (1-5 marks)
    part_b = []  # Medium answer (6-10 marks)
    part_c = []  # Long answer (11+ marks)
    
    for q in questions:
        marks = q.metadata.marks
        if marks <= 5:
            part_a.append(q)
        elif marks <= 10:
            part_b.append(q)
        else:
            part_c.append(q)
    
    # Calculate totals
    part_a_total = sum(q.metadata.marks for q in part_a)
    part_b_total = sum(q.metadata.marks for q in part_b)
    part_c_total = sum(q.metadata.marks for q in part_c)
    grand_total = part_a_total + part_b_total + part_c_total
    
    print(f"   Part A: {len(part_a)} questions, {part_a_total} marks")
    print(f"   Part B: {len(part_b)} questions, {part_b_total} marks")
    print(f"   Part C: {len(part_c)} questions, {part_c_total} marks")
    print(f"   Total: {len(questions)} questions, {grand_total} marks")
    
    structure = {
        "Part A": {
            "title": "Short Answer Questions",
            "instructions": "Answer ALL questions. Each question carries equal marks.",
            "questions": part_a,
            "total_marks": part_a_total
        },
        "Part B": {
            "title": "Medium Answer Questions", 
            "instructions": "Answer any FOUR questions.",
            "questions": part_b,
            "total_marks": part_b_total
        },
        "Part C": {
            "title": "Long Answer Questions",
            "instructions": "Answer any TWO questions.",
            "questions": part_c,
            "total_marks": part_c_total
        },
        "metadata": {
            "total_questions": len(questions),
            "total_marks": grand_total
        }
    }
    
    return {"final_exam_structure": structure}


# =============================================================================
# GRAPH CONSTRUCTION
# =============================================================================

def build_examiner_graph():
    """
    Constructs the complete examiner agent workflow.
    
    Flow:
    ┌─────────────────┐
    │    Blueprint    │  ← Analyzes syllabus, creates module structure
    └────────┬────────┘
             ▼
    ┌─────────────────┐
    │    Selector     │  ← Selects questions from exam bank
    └────────┬────────┘
             ▼
    ┌─────────────────┐
    │   Assembler     │  ← Organizes into exam parts
    └────────┬────────┘
             ▼
          [END]
    """
    workflow = StateGraph(ExaminerState)
    
    # Add nodes
    workflow.add_node("blueprint", blueprint_node)
    workflow.add_node("selector", selector_node)
    workflow.add_node("assembler", assembler_node)
    
    # Define flow
    workflow.set_entry_point("blueprint")
    workflow.add_edge("blueprint", "selector")
    workflow.add_edge("selector", "assembler")
    workflow.add_edge("assembler", END)
    
    return workflow.compile()


# Export the compiled graph
examiner_graph = build_examiner_graph()
