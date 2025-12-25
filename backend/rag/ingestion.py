import os
from langchain_community.document_loaders import DirectoryLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from backend.core.config import settings
import re

def sanitize_session_name(name: str) -> str:
    """Sanitize session name for use in collection name."""
    # Remove special chars, replace spaces with underscore, lowercase
    clean = re.sub(r'[^a-zA-Z0-9\s]', '', name)
    clean = re.sub(r'\s+', '_', clean.strip())
    return clean.lower()[:50]  # Limit length

def get_vector_store(user_id: str = "default_user", session_name: str = "default"):
    """
    Get or create a vector store for a specific user session.
    Each session has its own isolated collection.
    """
    # Use local HuggingFace embeddings (no API key needed)
    embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")

    # Sanitize session name for collection naming
    safe_session = sanitize_session_name(session_name)
    
    # User and session scoped collection
    collection_name = f"user_{user_id}_{safe_session}_rag"
    
    print(f"[RAG] Using collection: {collection_name}")
    
    vector_store = Chroma(
        persist_directory=settings.VECTOR_DB_PATH,
        embedding_function=embeddings,
        collection_name=collection_name
    )

    return vector_store

def get_retriever(user_id: str = "default_user", session_name: str = "default"):
    """Get retriever for a specific user session."""
    vs = get_vector_store(user_id, session_name)
    return vs.as_retriever(search_kwargs={"k": 3})

def list_user_sessions(user_id: str) -> list[dict]:
    """
    List all sessions for a user by scanning collections.
    Returns list of session info dicts.
    """
    import chromadb
    
    try:
        client = chromadb.PersistentClient(path=settings.VECTOR_DB_PATH)
        collections = client.list_collections()
        
        sessions = []
        prefix = f"user_{user_id}_"
        
        for col in collections:
            if col.name.startswith(prefix) and col.name.endswith("_rag"):
                # Extract session name from collection name
                # Format: user_{id}_{session_name}_rag
                session_name = col.name[len(prefix):-4]  # Remove prefix and _rag suffix
                
                # Get document count
                collection = client.get_collection(col.name)
                doc_count = collection.count()
                
                sessions.append({
                    "name": session_name,
                    "collection": col.name,
                    "document_count": doc_count
                })
        
        return sessions
    except Exception as e:
        print(f"[RAG] Error listing sessions: {e}")
        return []

def delete_session(user_id: str, session_name: str) -> bool:
    """
    Delete a specific session's collection.
    Returns True if successful.
    """
    import chromadb
    
    try:
        safe_session = sanitize_session_name(session_name)
        collection_name = f"user_{user_id}_{safe_session}_rag"
        
        client = chromadb.PersistentClient(path=settings.VECTOR_DB_PATH)
        client.delete_collection(collection_name)
        
        print(f"[RAG] Deleted collection: {collection_name}")
        return True
    except Exception as e:
        print(f"[RAG] Error deleting session: {e}")
        return False
