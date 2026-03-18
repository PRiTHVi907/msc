from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str
    
    # JWT
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRY_HOURS: int = 24
    
    # OpenAI
    OPENAI_API_KEY: str
    
    # Retell AI
    RETELL_API_KEY: str
    RETELL_AGENT_ID: str
    
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
