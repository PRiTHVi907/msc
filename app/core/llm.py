from openai import AsyncOpenAI
from app.core.config import settings

client = AsyncOpenAI(
    api_key=settings.OPENAI_API_KEY, 
    base_url="https://api.groq.com/openai/v1" # Point it to Groq instead of OpenAI
)
