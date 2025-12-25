"""
EduSynth Tutor Agent - LangGraph Implementation
================================================
A multi-node agentic workflow for intelligent tutoring with:
- Intent detection (language, audio, visual aids)
- RAG-based knowledge retrieval
- Structured output generation (mindmaps, flashcards)
- Regional language audio synthesis via Sarvam AI
"""

from typing import TypedDict, List, Optional, Literal
from langgraph.graph import StateGraph, END
from langchain_core.messages import SystemMessage, HumanMessage
from backend.core.llm import get_llm
from backend.rag.ingestion import get_retriever
from backend.services.sarvam_service import SarvamService
import re
import json

# =============================================================================
# STATE DEFINITION
# =============================================================================

class TutorState(TypedDict):
    """
    Shared state across all nodes in the tutor workflow.
    """
    # Input
    user_query: str
    user_id: str
    session_name: str  # Study session for context isolation
    
    # Intent Detection Results
    detected_intent: str  # "explain" | "mindmap" | "flashcard" | "quiz" | "audio"
    language_code: str    # Sarvam TTS language code
    generate_audio: bool  # Whether to generate audio output
    
    # Processing Results
    plan: List[str]       # Learning plan sub-topics
    context: str          # Retrieved RAG context
    
    # Output
    response: str                      # Main text response
    mindmap_source: Optional[str]      # Mermaid.js code for mindmap
    flashcards: Optional[List[dict]]   # Flashcard data
    audio_base64: Optional[str]        # Base64 encoded audio


# =============================================================================
# LANGUAGE & INTENT DETECTION
# =============================================================================

LANGUAGE_MAP = {
    "hindi": "hi-IN", "bengali": "bn-IN", "bangla": "bn-IN",
    "tamil": "ta-IN", "telugu": "te-IN", "kannada": "kn-IN",
    "malayalam": "ml-IN", "marathi": "mr-IN", "gujarati": "gu-IN",
    "punjabi": "pa-IN", "english": "en-IN",
}

INTENT_KEYWORDS = {
    "mindmap": ["mindmap", "mind map", "concept map", "diagram", "visual map"],
    "flashcard": ["flashcard", "flash card", "flash cards", "study cards", "revision cards"],
    "quiz": ["quiz", "test me", "test my knowledge", "mcq", "multiple choice"],
    "audio": ["audio", "speak", "voice", "podcast", "listen", "read aloud", "tell me",
              "batao", "samjhao", "sunao"],  # Hindi phrases
}


def detect_intent(query: str) -> str:
    """
    Detects the primary intent from user query.
    Returns: "mindmap" | "flashcard" | "quiz" | "audio" | "explain"
    """
    query_lower = query.lower()
    
    for intent, keywords in INTENT_KEYWORDS.items():
        if any(kw in query_lower for kw in keywords):
            return intent
    
    return "explain"  # Default intent


def detect_language(query: str) -> str:
    """
    Detects requested language for TTS from user query.
    Returns Sarvam language code (default: en-IN).
    """
    query_lower = query.lower()
    
    for lang_name, lang_code in LANGUAGE_MAP.items():
        patterns = [
            f"in {lang_name}", f"{lang_name} mein", f"{lang_name} me",
            f"{lang_name} audio", f"explain in {lang_name}"
        ]
        if any(p in query_lower for p in patterns):
            return lang_code
    
    return "en-IN"


def should_generate_audio(query: str, explicit_flag: bool) -> bool:
    """
    Determines if audio should be generated based on query or explicit flag.
    """
    if explicit_flag:
        return True
    
    query_lower = query.lower()
    
    # Audio keywords
    if any(kw in query_lower for kw in INTENT_KEYWORDS["audio"]):
        return True
    
    # Language mention implies audio desire
    for lang_name in LANGUAGE_MAP.keys():
        if f"in {lang_name}" in query_lower:
            return True
    
    return False


# =============================================================================
# AGENT NODES
# =============================================================================

def intent_router_node(state: TutorState) -> dict:
    """
    NODE 1: Intent Router
    =====================
    Role: Analyze user query to detect intent, language, and audio needs.
    This is the "brain" that decides how the rest of the pipeline behaves.
    """
    print("=" * 60)
    print("[INTENT ROUTER NODE]")
    print("=" * 60)
    
    query = state["user_query"]
    
    # Detect all intents
    primary_intent = detect_intent(query)
    language = detect_language(query)
    wants_audio = should_generate_audio(query, state.get("generate_audio", False))
    
    print(f"   Query: {query[:80]}...")
    print(f"   Intent: {primary_intent}")
    print(f"   Language: {language}")
    print(f"   Audio: {wants_audio}")
    
    return {
        "detected_intent": primary_intent,
        "language_code": language,
        "generate_audio": wants_audio
    }


def planner_node(state: TutorState) -> dict:
    """
    NODE 2: Curriculum Planner
    ==========================
    Role: Break down the topic into learnable sub-topics.
    Uses fast LLM for quick planning.
    """
    print("=" * 60)
    print("[PLANNER NODE]")
    print("=" * 60)
    
    llm = get_llm(mode="fast")
    query = state["user_query"]
    
    system_prompt = """You are an expert curriculum planner for an AI tutoring system.
Your ONLY job is to break down a topic into 3-5 key sub-topics for a short lesson.

RULES:
1. Return ONLY a comma-separated list of sub-topics
2. Keep each sub-topic concise (2-5 words)
3. Order them logically for learning progression
4. Do NOT include explanations or numbering

Example Input: "Explain photosynthesis"
Example Output: Light reactions, Calvin cycle, Chloroplast structure, Energy conversion, Environmental factors"""

    response = llm.invoke([
        SystemMessage(content=system_prompt),
        HumanMessage(content=f"Topic: {query}")
    ])
    
    plan = [item.strip() for item in response.content.split(",") if item.strip()]
    print(f"   Plan: {plan}")
    
    return {"plan": plan}


def retriever_node(state: TutorState) -> dict:
    """
    NODE 3: Knowledge Retriever
    ===========================
    Role: Fetch relevant context from user's uploaded documents.
    This grounds the tutor's response in user-specific materials.
    """
    print("=" * 60)
    print("[RETRIEVER NODE]")
    print("=" * 60)
    
    user_id = state.get("user_id", "default_user")
    session_name = state.get("session_name", "default")
    query = state["user_query"]
    plan = state.get("plan", [])
    
    print(f"   User: {user_id}")
    print(f"   Session: {session_name}")
    print(f"   Query: {query[:50]}...")
    
    try:
        retriever = get_retriever(user_id=user_id, session_name=session_name)
        
        # Retrieve for main query + plan items for comprehensive context
        all_contexts = []
        
        # Main query retrieval
        docs = retriever.invoke(query)
        all_contexts.extend([doc.page_content for doc in docs])
        
        # Retrieve for top 2 plan items if available
        for subtopic in plan[:2]:
            try:
                subtopic_docs = retriever.invoke(subtopic)
                all_contexts.extend([doc.page_content for doc in subtopic_docs[:2]])
            except:
                pass
        
        # Deduplicate and combine
        unique_contexts = list(dict.fromkeys(all_contexts))
        context = "\n\n---\n\n".join(unique_contexts[:5])  # Top 5 unique chunks
        
        print(f"   Retrieved {len(unique_contexts)} unique chunks")
        
    except Exception as e:
        print(f"   Retrieval Error: {e}")
        context = ""
    
    return {"context": context}


def generator_node(state: TutorState) -> dict:
    """
    NODE 4: Response Generator
    ==========================
    Role: Generate the final response based on intent and context.
    Uses smart LLM for high-quality structured output.
    
    Responsibilities:
    - explain: Clear educational explanation
    - mindmap: Mermaid.js diagram generation
    - flashcard: JSON flashcard generation
    - quiz: Interactive quiz generation
    """
    print("=" * 60)
    print("[GENERATOR NODE]")
    print("=" * 60)
    
    llm = get_llm(mode="smart")
    
    query = state["user_query"]
    context = state["context"]
    intent = state.get("detected_intent", "explain")
    
    print(f"   Intent: {intent}")
    
    # Base system prompt
    base_system = """You are EduSynth, an expert AI tutor. You MUST follow these rules:

CRITICAL RULES:
1. ONLY use information from the provided CONTEXT. Do NOT use outside knowledge.
2. If the context doesn't contain relevant information, say: "I don't have information about this in your uploaded documents. Please upload relevant materials."
3. Be conversational and engaging, like a helpful teacher.
4. Keep responses focused and not overly long."""

    # Intent-specific prompts
    if intent == "mindmap":
        system_prompt = base_system + """

MINDMAP GENERATION TASK:
You MUST generate a Mermaid.js mindmap. Do NOT explain what a mindmap is.

OUTPUT FORMAT (follow EXACTLY):
1. One brief sentence introducing the topic
2. A Mermaid.js code block:

```mermaid
mindmap
  root((Central Topic))
    Branch 1
      Detail 1a
      Detail 1b
    Branch 2
      Detail 2a
      Detail 2b
    Branch 3
      Detail 3a
```

REQUIREMENTS:
- Use information from the context for all branches
- Include at least 3-4 main branches
- Each branch should have 2-3 details
- Keep labels concise (2-4 words each)"""

    elif intent == "flashcard":
        system_prompt = base_system + """

FLASHCARD GENERATION TASK:
You MUST generate study flashcards. Do NOT explain what flashcards are.

OUTPUT FORMAT (follow EXACTLY):
1. One sentence introducing the flashcards
2. A JSON code block:

```json
{
  "flashcards": [
    {"id": "1", "question": "Question based on context", "answer": "Answer from context"},
    {"id": "2", "question": "Another question", "answer": "Another answer"},
    {"id": "3", "question": "Third question", "answer": "Third answer"},
    {"id": "4", "question": "Fourth question", "answer": "Fourth answer"},
    {"id": "5", "question": "Fifth question", "answer": "Fifth answer"}
  ]
}
```

REQUIREMENTS:
- Generate exactly 5 flashcards
- Questions should test key concepts from the context
- Answers should be concise but complete
- Vary question types (what, how, why, compare, etc.)"""

    elif intent == "quiz":
        system_prompt = base_system + """

QUIZ GENERATION TASK:
Generate a multiple-choice quiz based on the context.

OUTPUT FORMAT:
1. Brief intro
2. 3-5 quiz questions, each with:
   - Question text
   - 4 options (A, B, C, D)
   - Correct answer marked

Use this format for each question:
**Q1: [Question text]**
A) Option 1
B) Option 2
C) Option 3
D) Option 4
[Correct]: [Letter]"""

    else:  # Default: explain
        system_prompt = base_system + """

EXPLANATION TASK:
Provide a clear, educational explanation of the topic.

STRUCTURE:
1. Start with a brief overview (1-2 sentences)
2. Explain key concepts in logical order
3. Use examples from the context when available
4. End with a brief summary or key takeaway

STYLE:
- Be conversational like a helpful teacher
- Use simple language
- Break complex ideas into digestible parts"""

    # Build the prompt
    user_prompt = f"""CONTEXT (from user's uploaded documents):
{context if context else "No relevant context found in uploaded documents."}

USER QUERY: {query}

Generate your response now:"""

    response = llm.invoke([
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_prompt)
    ])
    
    content = response.content
    mindmap_source = None
    flashcards = None
    
    # Extract structured content
    
    # Mermaid mindmap
    mermaid_match = re.search(r"```mermaid\n(.*?)```", content, re.DOTALL)
    if mermaid_match:
        mindmap_source = mermaid_match.group(1).strip()
        content = content.replace(mermaid_match.group(0), "").strip()
        print("   [OK] Extracted mindmap")
    
    # JSON flashcards
    json_match = re.search(r"```json\n(.*?)```", content, re.DOTALL)
    if json_match:
        try:
            data = json.loads(json_match.group(1).strip())
            flashcards = data.get("flashcards", data if isinstance(data, list) else [])
            content = content.replace(json_match.group(0), "").strip()
            print(f"   [OK] Extracted {len(flashcards)} flashcards")
        except json.JSONDecodeError as e:
            print(f"   [ERROR] Flashcard JSON parse error: {e}")
    
    # Clean up residual markers
    content = re.sub(r"Here is the .*?:", "", content, flags=re.IGNORECASE).strip()
    content = re.sub(r"\n{3,}", "\n\n", content)  # Reduce excessive newlines
    
    return {
        "response": content,
        "mindmap_source": mindmap_source,
        "flashcards": flashcards
    }


def audio_node(state: TutorState) -> dict:
    """
    NODE 5: Audio Generator
    =======================
    Role: Convert text response to speech using Sarvam AI.
    Supports 10 Indian languages.
    """
    print("=" * 60)
    print("[AUDIO NODE]")
    print("=" * 60)
    
    text = state["response"]
    language_code = state.get("language_code", "en-IN")
    
    print(f"   Language: {language_code}")
    print(f"   Text length: {len(text)} chars")
    
    # Prepare text for TTS (limit length, clean special chars)
    clean_text = re.sub(r"[*#`]", "", text)  # Remove markdown chars
    clean_text = clean_text[:1000]  # Limit to 1000 chars for TTS
    
    try:
        audio = SarvamService.generate_audio(clean_text, language_code=language_code)
        if audio:
            print("   [OK] Audio generated successfully")
        else:
            print("   [WARN] Audio generation returned None")
    except Exception as e:
        print(f"   [ERROR] Audio generation error: {e}")
        audio = None
    
    return {"audio_base64": audio}


# =============================================================================
# CONDITIONAL ROUTING
# =============================================================================

def should_route_to_audio(state: TutorState) -> str:
    """
    Conditional edge: Decide whether to generate audio.
    """
    if state.get("generate_audio", False):
        return "audio"
    return END


# =============================================================================
# GRAPH CONSTRUCTION
# =============================================================================

def build_tutor_graph():
    """
    Constructs the complete tutor agent workflow.
    
    Flow:
    ┌─────────────────┐
    │  Intent Router  │  ← Analyzes query intent, language, audio needs
    └────────┬────────┘
             ▼
    ┌─────────────────┐
    │    Planner      │  ← Creates learning plan
    └────────┬────────┘
             ▼
    ┌─────────────────┐
    │   Retriever     │  ← Fetches relevant context from RAG
    └────────┬────────┘
             ▼
    ┌─────────────────┐
    │   Generator     │  ← Generates response based on intent
    └────────┬────────┘
             │
             ▼ (conditional)
    ┌─────────────────┐
    │     Audio       │  ← Optional TTS conversion
    └────────┬────────┘
             ▼
          [END]
    """
    workflow = StateGraph(TutorState)
    
    # Add nodes
    workflow.add_node("intent_router", intent_router_node)
    workflow.add_node("planner", planner_node)
    workflow.add_node("retriever", retriever_node)
    workflow.add_node("generator", generator_node)
    workflow.add_node("audio", audio_node)
    
    # Define flow
    workflow.set_entry_point("intent_router")
    workflow.add_edge("intent_router", "planner")
    workflow.add_edge("planner", "retriever")
    workflow.add_edge("retriever", "generator")
    
    # Conditional audio generation
    workflow.add_conditional_edges(
        "generator",
        should_route_to_audio,
        {
            "audio": "audio",
            END: END
        }
    )
    workflow.add_edge("audio", END)
    
    return workflow.compile()


# Export the compiled graph
tutor_graph = build_tutor_graph()
