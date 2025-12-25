from typing import List, Dict
import json
from langchain_core.messages import HumanMessage
from backend.core.llm import get_llm
from backend.rag.ingestion_exam import get_exam_vector_store
from backend.models.exam import ExamStructure, PlacedQuestion, ExamQuestion

def build_exam_from_syllabus(
    syllabus_text: str, 
    structure: ExamStructure,
    subject_filter: str = None,
    user_id: str = "default_user"
) -> List[PlacedQuestion]:
    """
    Selects questions from DB to match structure and syllabus.
    Optional subject_filter (e.g. "CS") restricts questions to matching source files.
    """
    print(f"Building exam from syllabus (Filter: {subject_filter})...")
    llm = get_llm(mode="smart")
    
    # Use the Official Exam Question Bank
    from backend.rag.ingestion_exam import get_exam_vector_store
    vector_store = get_exam_vector_store()
    
    # Step 1: Break syllabus into Unit topics
    prompt = f"""
    Break down this syllabus into {structure.unit_count} distinct key topics (Units).
    Return a list of strings, one for each unit topic.
    
    Syllabus:
    {syllabus_text[:4000]}
    """
    
    unit_topics = []
    try:
        response = llm.invoke([HumanMessage(content=prompt)])
        # Simple parsing assumption: LLM returns a list or numbered lines
        content = response.content
        lines = [l.strip() for l in content.split('\n') if l.strip() and (l[0].isdigit() or l.startswith('-'))]
        unit_topics = lines[:structure.unit_count]
        
        # Fallback if parsing failed
        while len(unit_topics) < structure.unit_count:
            unit_topics.append(f"Unit {len(unit_topics)+1} General Topic")
            
    except Exception as e:
        print(f"Syllabus breakdown error: {e}")
        unit_topics = [f"Unit {i+1}" for i in range(structure.unit_count)]

    placed_questions = []
    used_ids = set()
    
    # Step 2: Fill slots
    for i, topic in enumerate(unit_topics):
        unit_num = i + 1
        print(f"  Selecting for Unit {unit_num}: {topic}...")
        
        # Determine how many main choices (A and optionally B)
        choices = ["A", "B"] if structure.has_or_choice else ["A"]
        
        for choice in choices:
            for sub_label in structure.subquestion_labels:
                # Query DB with higher K to allow for filtering
                query = f"{topic} {sub_label}" 
                results = vector_store.similarity_search(query, k=25)
                
                selected_doc = None
                for doc in results:
                    # Filter by subject if requested
                    source_file = doc.metadata.get("source_file", "")
                    if subject_filter and subject_filter.lower() not in source_file.lower():
                        continue
                        
                    # Duplicate check
                    doc_id = hash(doc.page_content)
                    if doc_id not in used_ids:
                        selected_doc = doc
                        used_ids.add(doc_id)
                        break
                
                # Check if we failed to find a filtered match
                if not selected_doc:
                     if results:
                         # Relax filter? Or just leave empty?
                         # Let's fallback to unfiltered if strictly necessary, or placeholder
                         # Sticking to placeholder to avoid pollution
                         print(f"    No matching question found for filter '{subject_filter}'")
                         pass
                
                if selected_doc:
                    placed_q = PlacedQuestion(
                        unit_no=unit_num,
                        main_choice=choice,
                        sub_label=sub_label,
                        text=selected_doc.page_content,
                        marks=structure.marks_per_subquestion,
                        source_file=selected_doc.metadata.get("source_file", "Unknown"),
                        module=topic
                    )
                    placed_questions.append(placed_q)
                else:
                    # Placeholder if DB is empty
                    placed_questions.append(PlacedQuestion(
                        unit_no=unit_num,
                        main_choice=choice,
                        sub_label=sub_label,
                        text=f"Question about {topic} not found in DB.",
                        marks=structure.marks_per_subquestion,
                        source_file="System",
                        module=topic
                    ))
                    
    return placed_questions
