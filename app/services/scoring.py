import asyncio
from google import genai
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.models import Interview, Transcript, InterviewStatus

_SCORING_RUBRIC = """
You are a senior technical hiring manager. You have just reviewed a full interview transcript.
Evaluate the candidate's performance on a scale of 0-100 using this rubric:

- Technical Depth & Accuracy (40 pts): Are answers technically correct, precise, and detailed?
- Problem-Solving & Reasoning (25 pts): Does the candidate demonstrate structured thinking and trade-off awareness?
- Communication Clarity (20 pts): Are answers clear, concise, and well-structured?
- Proactivity & Leadership Signals (15 pts): Does the candidate demonstrate ownership, initiative, or mentorship?

Return ONLY a single integer between 0 and 100. No explanation. No punctuation. Just the number.
"""

_MODEL = "gemini-2.5-pro-preview-03-25"


async def calculate_ai_score(interview_id, db: AsyncSession | None = None) -> int | None:
    """
    Fetch all transcripts for the given interview, call Gemini to score them,
    persist the score to the Interview record, and return the integer score.
    Returns None if not enough transcript data exists.
    """
    own_session = db is None
    if own_session:
        db = AsyncSessionLocal()

    try:
        rows = (await db.execute(
            select(Transcript)
            .where(Transcript.interview_id == interview_id)
            .order_by(Transcript.timestamp)
        )).scalars().all()

        if len(rows) < 3:
            return None  # Not enough content to score

        transcript_text = "\n".join(
            f"[{r.speaker.upper()}]: {r.text_content}" for r in rows
        )
        prompt = f"{_SCORING_RUBRIC}\n\n--- INTERVIEW TRANSCRIPT ---\n{transcript_text}"

        if settings.GEMINI_API_KEY == "dummy":
            score = 72  # deterministic mock score
        else:
            client = genai.Client(api_key=settings.GEMINI_API_KEY)
            response = await asyncio.to_thread(
                client.models.generate_content,
                model=_MODEL,
                contents=prompt,
            )
            raw = response.text.strip()
            score = max(0, min(100, int(raw)))

        interview = (await db.execute(
            select(Interview).where(Interview.id == interview_id)
        )).scalar_one_or_none()

        if interview:
            interview.ai_score = float(score)
            interview.status = InterviewStatus.completed
            await db.commit()

        return score

    except (ValueError, AttributeError):
        return None           # Gemini returned non-integer
    except Exception:
        if own_session:
            await db.rollback()
        return None
    finally:
        if own_session:
            await db.aclose()
