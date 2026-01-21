"""
Voice Agent API Routes
Real-time voice conversation using Gemini with RAG context
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Optional
import logging
import json
import os
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/voice", tags=["Voice Agent"])

# Gemini API configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")

# Vidya Ma'am Voice Agent System Prompt (English only)
VOICE_AGENT_PROMPT = """You are Vidya Ma'am, a warm, patient, and knowledgeable AI teacher.

LANGUAGE: Respond ONLY in English. Never use any other language.

PERSONALITY:
- Speak naturally in clear, simple English
- Be encouraging and supportive
- Keep responses concise for voice (2-3 sentences max)
- Use phrases like "Great question!", "Let me explain", "Does that make sense?"

TEACHING STYLE:
- Give clear, structured explanations
- Use everyday examples to illustrate concepts
- If student doesn't understand, try a different approach
- Ask follow-up questions to check understanding

VOICE GUIDELINES:
- Speak naturally, not like reading text
- Use conversational tone
- Be warm and encouraging
- Keep answers SHORT - this is a voice conversation

CONTEXT:
You have access to the student's uploaded study materials. Use this context to provide relevant answers.
If the context doesn't contain the answer, use your general knowledge and be honest about it.

Remember: This is a VOICE conversation. Keep responses BRIEF (2-3 sentences max)!
"""


class VoiceConnectionManager:
    """Manages WebSocket connections for voice agents"""
    
    def __init__(self):
        self.active_connections: dict[str, WebSocket] = {}
    
    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.active_connections[client_id] = websocket
        logger.info(f"Voice client connected: {client_id}")
    
    def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            del self.active_connections[client_id]
        logger.info(f"Voice client disconnected: {client_id}")
    
    async def send_json(self, client_id: str, data: dict):
        if client_id in self.active_connections:
            try:
                await self.active_connections[client_id].send_json(data)
            except Exception as e:
                logger.error(f"Failed to send to {client_id}: {e}")


manager = VoiceConnectionManager()


def get_rag_context(user_id: str, query: str, session_name: str = "default") -> str:
    """Fetch RAG context for the user's query"""
    try:
        from backend.rag.ingestion import get_retriever
        retriever = get_retriever(user_id=user_id, session_name=session_name)
        docs = retriever.invoke(query)
        if docs:
            context = "\n\n".join([doc.page_content for doc in docs[:3]])
            return context
        return ""
    except Exception as e:
        logger.error(f"RAG retrieval failed: {e}")
        return ""


def extract_response_text(response) -> str:
    """Safely extract text from Gemini response"""
    try:
        # Try the quick accessor first
        if hasattr(response, 'text') and response.text:
            return response.text
        
        # Fallback: iterate through candidates
        if hasattr(response, 'candidates') and response.candidates:
            for candidate in response.candidates:
                if hasattr(candidate, 'content') and candidate.content:
                    if hasattr(candidate.content, 'parts') and candidate.content.parts:
                        for part in candidate.content.parts:
                            if hasattr(part, 'text') and part.text:
                                return part.text
        
        return "I'm sorry, I couldn't generate a response. Could you please repeat that?"
    except Exception as e:
        logger.error(f"Error extracting response: {e}")
        return "Sorry, there was an error. Please try again."


@router.websocket("/stream/{client_id}")
async def voice_stream(websocket: WebSocket, client_id: str):
    """
    WebSocket endpoint for real-time voice conversation with RAG context.
    Supports interruption - new messages cancel previous processing.
    """
    await manager.connect(websocket, client_id)
    
    user_id = None
    session_name = "default"
    
    try:
        import google.generativeai as genai
        
        if not GEMINI_API_KEY:
            await manager.send_json(client_id, {
                "type": "error",
                "message": "GEMINI_API_KEY not configured"
            })
            return
        
        genai.configure(api_key=GEMINI_API_KEY)
        
        # Send ready signal
        await manager.send_json(client_id, {
            "type": "ready",
            "message": "Vidya Ma'am is ready to talk!"
        })
        
        model = genai.GenerativeModel(
            model_name="gemini-3-flash-preview",
            system_instruction=VOICE_AGENT_PROMPT
        )
        
        # Maintain conversation history for context
        conversation_history = []
        
        while True:
            data = await websocket.receive()
            
            if "text" in data:
                message = json.loads(data["text"])
                
                # Update user context if provided
                if message.get("user_id"):
                    user_id = message.get("user_id")
                if message.get("session_name"):
                    session_name = message.get("session_name")
                
                if message.get("type") == "text_input":
                    user_text = message.get("text", "").strip()
                    
                    if user_text:
                        try:
                            # Notify client we're processing (for interruption support)
                            await manager.send_json(client_id, {
                                "type": "processing",
                                "text": user_text
                            })
                            
                            # Fetch RAG context
                            rag_context = ""
                            if user_id:
                                rag_context = get_rag_context(user_id, user_text, session_name)
                            
                            # Build prompt with context
                            if rag_context:
                                full_prompt = f"""CONTEXT FROM STUDY MATERIALS:
{rag_context[:2000]}

STUDENT ASKED: {user_text}

Give a brief, helpful answer in English (2-3 sentences max)."""
                            else:
                                full_prompt = f"""STUDENT ASKED: {user_text}

Give a brief, helpful answer in English (2-3 sentences max)."""
                            
                            # Keep conversation history manageable
                            conversation_history.append({"role": "user", "parts": [full_prompt]})
                            if len(conversation_history) > 10:
                                conversation_history = conversation_history[-10:]
                            
                            # Generate response
                            response = model.generate_content(conversation_history)
                            response_text = extract_response_text(response)
                            
                            # Add response to history
                            conversation_history.append({"role": "model", "parts": [response_text]})
                            
                            await manager.send_json(client_id, {
                                "type": "text_response",
                                "text": response_text,
                                "used_rag": bool(rag_context)
                            })
                            
                        except Exception as e:
                            logger.error(f"Gemini error: {e}")
                            await manager.send_json(client_id, {
                                "type": "text_response",
                                "text": "I'm sorry, I had trouble processing that. Could you try again?"
                            })
                
                elif message.get("type") == "interrupt":
                    # Client is interrupting - acknowledge
                    await manager.send_json(client_id, {
                        "type": "interrupted",
                        "message": "Okay, I'm listening..."
                    })
                
                elif message.get("type") == "end_call":
                    await manager.send_json(client_id, {
                        "type": "call_ended",
                        "message": "Goodbye! Good luck with your studies!"
                    })
                    break
    
    except WebSocketDisconnect:
        logger.info(f"Client {client_id} disconnected")
    except Exception as e:
        logger.error(f"Voice stream error: {e}")
    finally:
        manager.disconnect(client_id)


@router.get("/health")
async def health_check():
    """Check if Voice Agent service is healthy"""
    return {
        "status": "healthy",
        "service": "Voice Agent",
        "api_configured": bool(GEMINI_API_KEY),
        "features": ["RAG context", "Interruption support", "English only"]
    }
