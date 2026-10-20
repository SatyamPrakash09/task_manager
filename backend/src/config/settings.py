from functools import lru_cache
from typing import Optional
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    MONGODB_URL:str = "URL"
    PORT:int = 3000
    HOST:str = "localhost"
    RELOAD:bool=True
    LLM:str = "gemma4:12b"
    LLM_PROVIDER:str = "ollama"
    LLM_API_KEY:Optional[str] = None
    
    class Config:
        env_file=".env"
        env_encoding = "utf-8"
        case_sensitive = True
        extra = "ignore"

@lru_cache
def get_setting()->Settings:
    return Settings()
