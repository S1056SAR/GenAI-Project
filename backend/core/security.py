from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from google.oauth2 import id_token
from google.auth.transport import requests
from backend.core.config import settings

# Helper for parsing Bearer token
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token", auto_error=False)

class User(BaseModel):
    id: str
    email: str
    name: str = "Unknown"

def verify_google_token(token: str) -> dict:
    try:
        # If no client ID is set (dev mode), return mock user
        if not settings.GOOGLE_CLIENT_ID:
             # WARNING: For dev only. In prod, enforce ID.
             if token.startswith("test_token_"):
                 return {"sub": token, "email": "test@example.com", "name": "Test User"}
             
        idinfo = id_token.verify_oauth2_token(
            token, 
            requests.Request(), 
            settings.GOOGLE_CLIENT_ID
        )
        return idinfo
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    """
    Validates the token and returns the user.
    """
    if not token:
        # Allow unauthorized access for now if needed, or raise 401
        # For strict mode:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    payload = verify_google_token(token)
    
    return User(
        id=payload.get("sub"),
        email=payload.get("email"),
        name=payload.get("name", "User")
    )
