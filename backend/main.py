from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import time

# Routers
from backend.api.routes_rag import router as rag_router
from backend.api.routes_tutor import router as tutor_router
from backend.api.routes_exam import router as exam_router
from backend.api.routes_journey import router as journey_router
from backend.api.routes_doubt import router as doubt_router
from backend.api.routes_voice import router as voice_router
from backend.api.routes_video import router as video_router

# Core
from backend.rag.ingestion import get_vector_store
from backend.core.config import settings
from backend.core.errors import global_exception_handler
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize vector store on startup
    print("Initializing Vector Store...")
    if settings.GROQ_API_KEY:
        print(f"Groq Key loaded: {settings.GROQ_API_KEY[:4]}...")
    
    if settings.SARVAM_API_KEY:
        print(f"Sarvam Key loaded: {settings.SARVAM_API_KEY[:4]}...")
    else:
        print("ERROR: Sarvam Key NOT loaded!")
    
    try:
        # Initial check only, scoped calls happen per request
        get_vector_store(user_id="default_user") 
    except Exception as e:
        print(f"Warning: Failed to initialize vector store: {e}")
    yield
    print("Shutting down...")

app = FastAPI(title="EduSynth Backend", lifespan=lifespan)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception Handlers
# Note: In FastAPI >0.73, exception handlers for Exception catch usage errors too.
app.add_exception_handler(Exception, global_exception_handler)

# Simple Logging Middleware
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    # Log format: Method | Path | Status | Time
    print(f"{request.method} {request.url.path} - {response.status_code} - {process_time:.4f}s")
    response.headers["X-Process-Time"] = str(process_time)
    return response

# Routes
app.include_router(rag_router)
app.include_router(tutor_router)
app.include_router(exam_router, prefix="/exam", tags=["exam"])
app.include_router(journey_router, prefix="/journey", tags=["journey"])
app.include_router(doubt_router)
app.include_router(voice_router)
app.include_router(video_router)

# Mount static files to serve generated PDFs
from fastapi.staticfiles import StaticFiles
import os
os.makedirs("generated_exams", exist_ok=True) # Ensure dir exists
app.mount("/downloads", StaticFiles(directory="."), name="downloads")

@app.get("/")
async def root():
    return {"status": "EduSynth backend up"}
