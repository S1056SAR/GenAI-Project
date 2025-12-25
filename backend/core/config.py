from pydantic_settings import BaseSettings
from functools import lru_cache

from typing import Optional, List

class Settings(BaseSettings):
    GROQ_API_KEY: Optional[str] = None
    GROQ_INGESTION_KEYS: Optional[str] = None # Comma-separated list for exam ingestion
    SARVAM_API_KEY: str
    GOOGLE_CLIENT_ID: Optional[str] = None
    CORS_ORIGINS: List[str] = ["http://localhost:3000"] # Default to frontend
    VECTOR_DB_PATH: str = "data/vector_store"
    
    @property
    def groq_keys_list(self) -> list[str]:
        """
        Returns list of keys specifically for heavy ingestion tasks.
        Prioritizes GROQ_INGESTION_KEYS.
        """
        if self.GROQ_INGESTION_KEYS:
            # Normalize delimiters: replace newlines and semicolons with commas
            normalized = self.GROQ_INGESTION_KEYS.replace("\n", ",").replace(";", ",")
            return [k.strip() for k in normalized.split(",") if k.strip()]
        
        # Fallback: Use standard single key
        if self.GROQ_API_KEY:
            return [self.GROQ_API_KEY]
        return []

    class Config:
        env_file = ".env"
        extra = "ignore"

@lru_cache()
def get_settings():
    return Settings()

settings = get_settings()
