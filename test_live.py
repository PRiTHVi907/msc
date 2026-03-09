import asyncio
import os
from google import genai
from google.genai import types

async def main():
    import dotenv
    dotenv.load_dotenv('.env')
    
    # Strip the priority GOOGLE_API_KEY if it exists in the system so it uses the local GEMINI_API_KEY
    if 'GOOGLE_API_KEY' in os.environ:
        del os.environ['GOOGLE_API_KEY']
        
    client = genai.Client(
        api_key=os.environ.get('GEMINI_API_KEY')
    )
    
    models = [
        "gemini-2.0-flash",
        "gemini-2.5-flash",
    ]
    
    for m in models:
        print(f"Testing {m}...")
        try:
            async with client.aio.live.connect(model=m) as session:
                print(f"SUCCESS: {m} works for Live API!")
                return
        except Exception as e:
            print(f"FAILED {m}: {str(e)[:150]}")

if __name__ == "__main__":
    asyncio.run(main())
