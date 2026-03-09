import asyncio
import os
from google import genai

async def main():
    import dotenv
    dotenv.load_dotenv('.env')
    
    # Strip the priority GOOGLE_API_KEY if it exists in the system
    if 'GOOGLE_API_KEY' in os.environ:
        del os.environ['GOOGLE_API_KEY']
        
    api_key = os.environ.get('GEMINI_API_KEY')
    print(f"API Key exists: {bool(api_key)}")
    
    # Test with different API versions
    api_versions = [None, "v1alpha", "v1"]
    models = [
        "gemini-2.0-flash-live-001",
        "gemini-2.0-flash",
    ]
    
    for api_ver in api_versions:
        print(f"\n=== Testing API version: {api_ver} ===")
        try:
            if api_ver:
                client = genai.Client(
                    api_key=api_key,
                    http_options={"api_version": api_ver}
                )
            else:
                client = genai.Client(api_key=api_key)
            
            for model in models:
                print(f"\nTesting {model}...")
                try:
                    # Try to list available models
                    from google.genai import types
                    async with client.aio.live.connect(model=model) as session:
                        print(f"✓ SUCCESS: {model} works!")
                        return
                except Exception as e:
                    error_msg = str(e)[:200]
                    print(f"✗ FAILED: {error_msg}")
        except Exception as e:
            print(f"Client creation failed: {str(e)[:200]}")

    # Try listing models to see what's available
    print("\n=== Available Models ===")
    try:
        client = genai.Client(api_key=api_key)
        models_list = await client.aio.models.list()
        for model in models_list:
            if "flash" in model.name.lower():
                print(f"- {model.name}")
    except Exception as e:
        print(f"Could not list models: {str(e)}")

if __name__ == "__main__":
    asyncio.run(main())
