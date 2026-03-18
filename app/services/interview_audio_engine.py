import asyncio
import base64
import os
from typing import AsyncIterator

from deepgram import DeepgramClient, DeepgramClientOptions, PrerecordedOptions, FileSource
from google import genai
from google.genai import types
from elevenlabs.client import AsyncElevenLabs


class InterviewAudioEngine:
    """
    Orchestrates a single audio turn: STT (Deepgram) → LLM (Gemini) → TTS (ElevenLabs).
    """

    def __init__(self, system_prompt: str | None = None) -> None:
        self.dg_client = DeepgramClient(os.environ["DEEPGRAM_API_KEY"])
        self.llm_client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
        self.tts_client = AsyncElevenLabs(api_key=os.environ["ELEVENLABS_API_KEY"])

        self.chat_session = self.llm_client.chats.create(
            model="gemini-2.5-flash",
            config=types.GenerateContentConfig(
                system_instruction=(
                    system_prompt
                    or (
                        "You are a strict, professional corporate recruiter conducting a technical interview. "
                        "Ask exactly 3 focused questions, one at a time. "
                        "Keep responses concise—under 60 words per turn. "
                        "Do not repeat questions you have already asked."
                    )
                )
            ),
        )

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def process_turn(self, candidate_audio_bytes: bytes) -> bytes:
        """
        Process one conversation turn end-to-end.

        Args:
            candidate_audio_bytes: Raw audio bytes from the candidate microphone.

        Returns:
            PCM-16000 audio bytes of the AI recruiter's spoken response.
        """
        transcript: str = await self._transcribe_audio(candidate_audio_bytes)
        ai_text: str = self._generate_response(transcript)
        ai_audio: bytes = await self._synthesize_speech(ai_text)
        return ai_audio

    # ------------------------------------------------------------------
    # Private Steps
    # ------------------------------------------------------------------

    async def _transcribe_audio(self, audio_bytes: bytes) -> str:
        """Deepgram nova-2 → smart-formatted transcript string."""
        source: FileSource = {"buffer": audio_bytes}
        options = PrerecordedOptions(
            model="nova-2",
            smart_format=True,
            punctuate=True,
        )
        response = await self.dg_client.listen.asyncprerecorded.v("1").transcribe_file(
            source, options
        )
        try:
            transcript = (
                response["results"]["channels"][0]["alternatives"][0]["transcript"]
            )
        except (KeyError, IndexError):
            transcript = ""

        return transcript.strip()

    def _generate_response(self, transcript: str) -> str:
        """Feed transcript into the live Gemini chat session and return the reply text."""
        if not transcript:
            return "I'm sorry, I didn't catch that. Could you please repeat your answer?"

        response = self.chat_session.send_message(transcript)
        return response.text.strip()

    async def _synthesize_speech(self, text: str) -> bytes:
        """ElevenLabs turbo TTS → PCM-16000 bytes assembled from async chunks."""
        audio_stream: AsyncIterator[bytes] = self.tts_client.generate(
            text=text,
            voice="Rachel",
            model="eleven_turbo_v2_5",
            output_format="pcm_16000",
        )
        chunks: list[bytes] = [chunk async for chunk in audio_stream]
        return b"".join(chunks)


# ------------------------------------------------------------------
# Smoke test
# ------------------------------------------------------------------

if __name__ == "__main__":
    import sys

    async def _smoke_test() -> None:
        # 1-second of silent 16-kHz mono PCM as a dummy payload
        SAMPLE_RATE = 16_000
        DURATION_S = 1
        dummy_audio: bytes = bytes(SAMPLE_RATE * DURATION_S * 2)  # 16-bit = 2 bytes/sample

        print("=== InterviewAudioEngine Smoke Test ===")
        print(f"Input  audio payload : {len(dummy_audio):,} bytes")

        engine = InterviewAudioEngine()

        try:
            output_audio: bytes = await engine.process_turn(dummy_audio)
            print(f"Output audio payload : {len(output_audio):,} bytes")
            print("✓ Pipeline completed successfully.")
        except Exception as exc:
            print(f"✗ Pipeline failed: {exc}", file=sys.stderr)
            raise

    asyncio.run(_smoke_test())
