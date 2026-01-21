"""
Doubt Solver Agent - 3D Avatar Teacher Assistant
Uses Gemini 3 Pro for reasoning, RAG for context, DuckDuckGo for web search fallback
"""

import os
import google.generativeai as genai
from duckduckgo_search import DDGS
from typing import Optional
import logging
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

logger = logging.getLogger(__name__)

# Configure Gemini API - check both possible env var names
api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
if api_key:
    genai.configure(api_key=api_key)
else:
    logger.warning("No Gemini/Google API key found. Set GEMINI_API_KEY or GOOGLE_API_KEY in .env")

VIDYA_MAAM_PROMPT = """
You are "Vidya Ma'am", an experienced and compassionate teacher avatar in EduSynth's 3D Doubt Solver.

## YOUR PERSONA
- You are a warm, patient, and encouraging female teacher in her 30s
- You speak in a clear, structured manner suitable for students
- You use relatable examples and analogies from everyday Indian life
- You celebrate small victories and never make students feel bad for not knowing something
- You often use phrases like "Bahut accha sawaal hai!" or "Let me explain this step by step"

## YOUR TEACHING STYLE
1. **Acknowledge the Question**: Start by validating the student's doubt
2. **Structured Explanation**: Break down complex topics into digestible parts
3. **Examples & Analogies**: Use real-world Indian context examples
4. **Visual Cues**: Mention what you'd write on the blackboard
5. **Check Understanding**: End with a quick recap or follow-up question
6. **Encouragement**: Always end on a positive, motivating note

## RESPONSE STRUCTURE
When answering doubts:
1. "Good question! Let me explain..." (acknowledgment)
2. Main explanation with numbered points if complex
3. A simple example from daily life
4. "On the blackboard, I would write: [key formula/concept]"
5. "Does this make sense? Let me know if you want me to elaborate on any part."

## LANGUAGE HANDLING
- Detect if student speaks in Hindi, Tamil, or English
- Match response language to student's preference
- For Hindi: Use simple Hinglish that's easy to understand
- For technical terms: Say in English, then explain in regional language

## WHAT NOT TO DO
- Never say "I don't know" without trying web search
- Never give one-word answers
- Never be condescending or impatient
- Never skip the encouragement at the end

## CONTEXT PROVIDED
You will receive:
1. UPLOADED_CONTEXT: Relevant excerpts from student's uploaded study materials
2. WEB_SEARCH_RESULTS: Additional information from web search (if context was insufficient)
3. STUDENT_DOUBT: The actual question from the student

Prioritize UPLOADED_CONTEXT, supplement with WEB_SEARCH_RESULTS, and use your reasoning for synthesis.
"""


class DoubtSolverAgent:
    """Agent for resolving student doubts with RAG + Web Search + Gemini 3 Pro reasoning"""
    
    def __init__(self):
        self.model = genai.GenerativeModel(
            model_name="gemini-3-flash-preview",  # Latest Gemini 3 Flash (Jan 2025)
            system_instruction=VIDYA_MAAM_PROMPT
        )
        self.ddgs = DDGS()
    
    def search_web(self, query: str, max_results: int = 5) -> str:
        """Search DuckDuckGo for additional context"""
        try:
            results = self.ddgs.text(query, max_results=max_results)
            if not results:
                return ""
            
            formatted = []
            for r in results:
                formatted.append(f"- **{r.get('title', 'No title')}**: {r.get('body', '')}")
            
            return "\n".join(formatted)
        except Exception as e:
            logger.error(f"DuckDuckGo search failed: {e}")
            return ""
    
    def is_context_sufficient(self, context: str, min_length: int = 100) -> bool:
        """Check if RAG context is sufficient to answer the question"""
        if not context or len(context.strip()) < min_length:
            return False
        return True
    
    async def solve_doubt(
        self, 
        doubt: str, 
        rag_context: Optional[str] = None,
        user_id: Optional[str] = None,
        session_name: Optional[str] = None
    ) -> str:
        """
        Main method to solve a student's doubt
        
        Args:
            doubt: The student's question
            rag_context: Pre-fetched context from RAG (if available)
            user_id: User ID for RAG retrieval
            session_name: Session name for scoped RAG
        
        Returns:
            Teacher's response as string
        """
        # Fetch RAG context if not provided
        if rag_context is None and user_id:
            try:
                from backend.rag.ingestion import get_retriever
                retriever = get_retriever(user_id=user_id, session_name=session_name or "default")
                docs = retriever.invoke(doubt)
                rag_context = "\n\n".join([doc.page_content for doc in docs])
            except Exception as e:
                logger.error(f"RAG retrieval failed: {e}")
                rag_context = ""
        
        # Check if web search is needed
        web_context = ""
        if not self.is_context_sufficient(rag_context):
            logger.info("RAG context insufficient, performing web search...")
            web_context = self.search_web(doubt)
        
        # Build the prompt
        prompt = f"""
## UPLOADED_CONTEXT (from student's study materials):
{rag_context if rag_context else "No materials uploaded for this session."}

## WEB_SEARCH_RESULTS (supplementary information):
{web_context if web_context else "No web search performed - context was sufficient."}

## STUDENT_DOUBT:
{doubt}

---

Now, as Vidya Ma'am, please answer this doubt in your characteristic warm and educational style.
"""
        
        try:
            response = self.model.generate_content(prompt)
            return response.text
        except Exception as e:
            logger.error(f"Gemini API error: {e}")
            return f"Beta, sorry! There seems to be a technical issue. Please try asking your doubt again. Error: {str(e)}"


# Singleton instance
doubt_solver = DoubtSolverAgent()


async def solve_doubt(
    doubt: str,
    rag_context: Optional[str] = None,
    user_id: Optional[str] = None,
    session_name: Optional[str] = None
) -> str:
    """Convenience function to solve a doubt"""
    return await doubt_solver.solve_doubt(
        doubt=doubt,
        rag_context=rag_context,
        user_id=user_id,
        session_name=session_name
    )
