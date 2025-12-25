from fastapi import APIRouter, HTTPException, UploadFile, File, Depends, Form
from backend.models.schemas import RAGQueryRequest, RAGQueryResponse
from backend.rag.query import rag_answer
from backend.core.security import get_current_user, User
from backend.rag.ingestion import get_vector_store, list_user_sessions, delete_session
from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
import shutil
import tempfile
import os
import traceback

router = APIRouter(prefix="/rag", tags=["rag"])

@router.post("/ask", response_model=RAGQueryResponse)
async def ask_rag(request: RAGQueryRequest):
    answer = await rag_answer(request.query)
    return RAGQueryResponse(answer=answer)

@router.get("/sessions")
async def get_sessions(user: User = Depends(get_current_user)):
    """
    List all study sessions for the current user.
    Each session has its own isolated RAG context.
    """
    sessions = list_user_sessions(user.id)
    return {"sessions": sessions}

@router.delete("/sessions/{session_name}")
async def remove_session(session_name: str, user: User = Depends(get_current_user)):
    """
    Delete a specific study session and its RAG context.
    """
    success = delete_session(user.id, session_name)
    if not success:
        raise HTTPException(status_code=404, detail="Session not found or could not be deleted")
    return {"status": "deleted", "session": session_name}

@router.post("/ingest")
async def ingest_files(
    files: list[UploadFile] = File(...), 
    session_name: str = Form(default="default"),
    user: User = Depends(get_current_user)
):
    """
    Ingests multiple files into a specific study session's RAG knowledge base.
    Each session has isolated context - materials won't mix between sessions.
    """
    # Fix for potential tokenizer parallelism deadlock/issues on Windows
    os.environ["TOKENIZERS_PARALLELISM"] = "false"
    
    print(f"[INGEST] User: {user.id}, Session: {session_name}")
    print(f"[INGEST] Processing {len(files)} files")
    results = []
    
    for file in files:
        print(f"[INGEST] File: {file.filename}")
        tmp_path = None
        try:
            # Save to temp file
            with tempfile.NamedTemporaryFile(delete=False, suffix=f".{file.filename.split('.')[-1]}") as tmp:
                shutil.copyfileobj(file.file, tmp)
                tmp_path = tmp.name
            
            docs = []
            if file.filename.endswith(".pdf"):
                print("[INGEST] Using PyPDFLoader...")
                loader = PyPDFLoader(tmp_path)
                docs = loader.load()
            else:
                print("[INGEST] Using TextLoader...")
                loader = TextLoader(tmp_path)
                docs = loader.load()
            
            print(f"[INGEST] Extracted {len(docs)} document pages.")
            if not docs:
                raise ValueError("No content extracted from file.")
            
            # Sanity Check Text
            total_text_len = sum([len(d.page_content) for d in docs])
            print(f"[INGEST] Total text: {total_text_len} chars")
            
            if total_text_len < 10:
                print("[INGEST] WARNING: Very little content extracted.")
                
            # Split text
            text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
            splits = text_splitter.split_documents(docs)
            print(f"[INGEST] Created {len(splits)} chunks.")
            
            if not splits:
                raise ValueError("Text splitting resulted in 0 chunks.")

            # Filter valid chunks
            splits = [s for s in splits if s.page_content.strip()]
            if not splits:
                 raise ValueError("All chunks were empty strings after stripping.")

            # Use raw texts for explicit embedding check
            texts = [s.page_content for s in splits]
            
            # Get session-scoped vector store
            vs = get_vector_store(user_id=user.id, session_name=session_name)
            
            # Generate embeddings
            print(f"[INGEST] Generating embeddings for {len(texts)} chunks...")
            try:
                test_embeds = vs.embeddings.embed_documents(texts)
                print(f"[INGEST] Generated {len(test_embeds)} embeddings.")
                if not test_embeds:
                    raise ValueError("Embedding model returned EMPTY list!")
                if len(test_embeds) != len(texts):
                    raise ValueError(f"Mismatch: {len(texts)} texts but {len(test_embeds)} embeddings.")
            except Exception as emb_err:
                print(f"[INGEST] EMBEDDING FAILURE: {emb_err}")
                raise ValueError(f"Embedding model failed: {emb_err}")

            # Add to vector store
            vs.add_documents(splits)
            print(f"[INGEST] Added to collection successfully.")
            
            results.append({
                "filename": file.filename, 
                "status": "success", 
                "chunks": len(splits),
                "session": session_name
            })
            
        except Exception as e:
            print(f"[INGEST] ERROR: {file.filename}: {e}")
            traceback.print_exc()
            results.append({
                "filename": file.filename, 
                "status": "error", 
                "error": str(e)
            })
        finally:
            if tmp_path and os.path.exists(tmp_path):
                os.remove(tmp_path)

    return {
        "results": results, 
        "summary": f"Processed {len(files)} files into session '{session_name}'.",
        "session": session_name
    }
