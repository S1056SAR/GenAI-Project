from langchain_groq import ChatGroq
from backend.core.config import settings

def get_llm(mode: str = "fast"):
    """
    Returns a LangChain LLM instance using Groq.
    
    Available Production Models (as of Dec 2024):
    - llama-3.1-8b-instant (fast, 8B params)
    - llama-3.3-70b-versatile (smart, 70B params) 
    - openai/gpt-oss-120b (highest quality, 120B params)
    
    mode: "fast" | "smart" | "best"
    """
    if mode == "best":
        model_name = "openai/gpt-oss-120b"
    elif mode == "smart":
        model_name = "llama-3.3-70b-versatile"
    else:
        model_name = "llama-3.1-8b-instant"
    
    return ChatGroq(
        model=model_name,
        groq_api_key=settings.GROQ_API_KEY,
        temperature=0.7
    )
