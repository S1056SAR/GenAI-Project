from fastapi import Request, status
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

class EduSynthError(Exception):
    """Base class for application errors."""
    def __init__(self, message: str, code: str = "INTERNAL_ERROR", status_code: int = 500):
        self.message = message
        self.code = code
        self.status_code = status_code

class LLMError(EduSynthError):
    def __init__(self, message: str):
        super().__init__(message, code="LLM_ERROR", status_code=503)

class PDFParseError(EduSynthError):
    def __init__(self, message: str):
        super().__init__(message, code="PDF_PARSE_ERROR", status_code=422)

class ResourceNotFoundError(EduSynthError):
    def __init__(self, message: str):
        super().__init__(message, code="NOT_FOUND", status_code=404)

async def global_exception_handler(request: Request, exc: Exception):
    if isinstance(exc, EduSynthError):
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.message, "code": exc.code}
        )
    
    # Handle standard FastAPI/Starlette HTTP exceptions
    if isinstance(exc, StarletteHTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": str(exc.detail), "code": "HTTP_ERROR"}
        )
        
    print(f"Unhandled Error: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error", "code": "INTERNAL_SERVER_ERROR"}
    )
