import os
import json
import time
import random
from typing import List, Optional
from langchain_community.document_loaders import PyPDFLoader
from langchain_chroma import Chroma
from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_core.messages import HumanMessage
from langchain_ollama import ChatOllama, OllamaEmbeddings
from langchain_groq import ChatGroq
from backend.core.config import settings
from backend.models.exam import ExamQuestion

# Global instance for exam vector store
_exam_vector_store = None

class GroqKeyManager:
    def __init__(self):
        self.keys = settings.groq_keys_list
        if not self.keys:
            raise ValueError("No GROQ_API_KEYS found in settings!")
        print(f"✅ Loaded {len(self.keys)} Groq Keys.")
        for i, k in enumerate(self.keys):
            print(f"   Key #{i+1}: '{k[:5]}...{k[-4:]}' (Length: {len(k)})")
        self.current_index = 0
        
    def get_current_key(self) -> str:
        return self.keys[self.current_index]
        
    def rotate_key(self) -> str:
        self.current_index = (self.current_index + 1) % len(self.keys)
        new_key = self.keys[self.current_index]
        print(f"🔄 Rotating to Groq Key #{self.current_index + 1}...")
        return new_key

_key_manager = GroqKeyManager()

def get_groq_llm(api_key: str):
    return ChatGroq(
        groq_api_key=api_key,
        model_name="llama-3.1-8b-instant",
        temperature=0.1
    )

def get_exam_vector_store():
    global _exam_vector_store
    
    if _exam_vector_store is not None:
        return _exam_vector_store

    # Use Nomic Embeddings (Ollama)
    embeddings = OllamaEmbeddings(model="nomic-embed-text")

    # Distinct collection for exam questions
    vector_store = Chroma(
        persist_directory=settings.VECTOR_DB_PATH,
        embedding_function=embeddings,
        collection_name="exam_questions"
    )
    
    _exam_vector_store = vector_store
    return vector_store

def extract_with_rotation(prompt: str, max_retries=10) -> str:
    """
    Invokes LLM with Key Rotation on 429 errors.
    """
    global _key_manager
    current_key = _key_manager.get_current_key()
    llm = get_groq_llm(current_key)
    
    for attempt in range(max_retries):
        try:
            response = llm.invoke([HumanMessage(content=prompt)])
            return response
        except Exception as e:
            error_msg = str(e).lower()
            if "429" in error_msg or "rate_limit" in error_msg:
                print(f"⚠️ Rate Limit Hit on Key #{_key_manager.current_index + 1}")
                # Rotate key immediately
                new_key = _key_manager.rotate_key()
                llm = get_groq_llm(new_key)
                time.sleep(1)
            elif "401" in error_msg or "invalid_api_key" in error_msg:
                print(f"❌ Invalid Key #{_key_manager.current_index + 1}. Rotating...")
                new_key = _key_manager.rotate_key()
                llm = get_groq_llm(new_key)
                time.sleep(0.5)
            else:
                raise e
    raise Exception("Max retries exceeded even with key rotation.")

async def ingest_exam_papers(directory_path: str = "data/question_papers"):
    """
    Ingests PDF question papers using Key-Rotated Groq + Nomic Embeddings.
    """
    print(f"Starting ingestion using {len(_key_manager.keys)} Groq Keys + Nomic...")
    
    if not os.path.exists(directory_path):
        os.makedirs(directory_path)
        print(f"Created directory {directory_path}.")
        return {"status": "empty"}

    vector_store = get_exam_vector_store()
    
    files = sorted([f for f in os.listdir(directory_path) if f.endswith('.pdf')])
    total_questions = 0
    
    stop_after_file = "CSOE09 AUG 2022.pdf"
    
    for filename in files:
        file_path = os.path.join(directory_path, filename)
        
        # Check if file is already ingested
        existing = vector_store.get(where={"source_file": filename})
        if existing and len(existing["ids"]) > 0:
            print(f"⏩ Skipping {filename} (Already ingested)")
            continue
            
        print(f"Processing {filename}...")
        
        try:
            loader = PyPDFLoader(file_path)
            pages = loader.load()
            
            for i, page in enumerate(pages):
                page_text = page.page_content
                if len(page_text) < 50: continue
                    
                print(f"  - Extracting from Page {i+1}...")
                
                prompt = f"""
                Extract distinct exam questions from this page text.
                Return a VALID JSON list where each item has:
                - "text": The full question text.
                - "marks": Integer value.
                - "module": Inferred topic.
                
                IMPORTANT: Escape quotes. Returns only JSON.
                Text:
                {page_text}
                """
                
                try:
                    response = extract_with_rotation(prompt)
                    content = response.content
                    
                    if "```json" in content:
                        content = content.split("```json")[1].split("```")[0]
                    elif "```" in content:
                        content = content.split("```")[1].split("```")[0]
                    
                    content = content.strip().replace("\n", " ")
                    
                    try:
                        questions_data = json.loads(content)
                    except:
                         start = content.find("[")
                         end = content.rfind("]") + 1
                         if start != -1 and end != -1:
                             content = content[start:end]
                             questions_data = json.loads(content)
                         else:
                             continue

                    documents = []
                    for q in questions_data:
                        metadata = {
                            "source_file": filename,
                            "marks": q.get("marks", 5),
                            "module": q.get("module", "General"),
                            "year": "2023",
                            "page": i+1
                        }
                        doc = Document(page_content=q["text"], metadata=metadata)
                        documents.append(doc)
                    
                    if documents:
                        vector_store.add_documents(documents)
                        total_questions += len(documents)
                        print(f"    Saved {len(documents)} questions.")
                        
                except Exception as e:
                    print(f"    Failed Page {i+1}: {e}")
                
        except Exception as e:
            print(f"Error {filename}: {e}")
            
        if filename == stop_after_file:
            print(f"🛑 Reached target file '{stop_after_file}'. Stopping ingestion.")
            break
            
    return {"status": "success", "total_questions": total_questions}
