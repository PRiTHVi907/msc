import asyncio
import os
from google import genai

async def main():
    import dotenv
    dotenv.load_dotenv('.env')
    
    # Clear any GOOGLE_API_KEY
    if 'GOOGLE_API_KEY' in os.environ:
        del os.environ['GOOGLE_API_KEY']
    
    api_key = os.environ.get('GEMINI_API_KEY')
    client = genai.Client(api_key=api_key)
    
    # List all available models with details
    print("=== Available Models for Live API ===\n")
    
    models_list = await client.aio.models.list()
    live_capable = []
    
    for model in models_list:
        model_name = model.name.replace('models/', '')
        # Check if model supports streaming
        if model.supported_generation_methods:
            methods = [m.lower() for m in model.supported_generation_methods]
            print(f"Model: {model_name}")
            print(f"  Methods: {methods}")
            if any('stream' in m or 'bidirectional' in m or 'live' in m for m in methods):
                live_capable.append(model_name)
                print(f"  ✓ Potentially supports Live API")
            print()
    
    print("\n=== Models that might support Live/Streaming ===")
    for m in live_capable:
        print(f"- {m}")

if __name__ == "__main__":
    asyncio.run(main())
