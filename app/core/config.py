from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str
    
    # JWT
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRY_HOURS: int = 24
    
    # Twilio
    TWILIO_ACCOUNT_SID: str
    TWILIO_AUTH_TOKEN: str
    TWILIO_API_KEY: str
    TWILIO_API_SECRET: str
    
    # Gemini
    GEMINI_API_KEY: str
    
    # AWS
    AWS_ACCESS_KEY_ID: str
    AWS_SECRET_ACCESS_KEY: str
    AWS_REGION: str
    S3_BUCKET_NAME: str
    AWS_ROLE_ARN: str
    
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
