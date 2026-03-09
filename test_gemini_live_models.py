import asyncio
import os
from google import genai
from google.genai import types

async def main():
    import dotenv
    dotenv.load_dotenv('.env')
    
    api_key = os.environ.get('GEMINI_API_KEY')
    
    # The error mentions bidiGenerateContent. Let's look for models that support that
    # Try different model names that might be specifically for live/streaming
    models = [
        "gemini-2.0-flash",
        "gemini-2.5-flash",
        "gemini-2.5-flash-native-audio-latest",
        "gemini-2.5-flash-native-audio-preview-12-2025",
        "gemini-2.0-flash-lite-001",
        "gemini-2.5-flash-lite",
        "gemini-flash-latest",
    ]
    
    client = genai.Client(api_key=api_key)
    
    for model in models:
        print(f"\n✓ Testing {model}...")
        try:
            async with client.aio.live.connect(model=model) as session:
                print(f"  ✓ SUCCESS: Connected to {model}")
                return
        except Exception as e:
            error_msg = str(e)[:150]
            if "policy violation" in error_msg:
                print(f"  ✗ Not supported: {error_msg}")
            else:
                print(f"  ✗ Error: {error_msg}")

if __name__ == "__main__":
    asyncio.run(main())
