import asyncio
import logging
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)
from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.models import Interview, Transcript, InterviewStatus
from app.core.llm import client as openai_client

_SCORING_RUBRIC = """
You are a senior technical hiring manager. You have just reviewed a full interview transcript.
Evaluate the candidate's performance on a scale of 0-100 using this rubric:

- Technical Depth & Accuracy (40 pts): Are answers technically correct, precise, and detailed?
- Problem-Solving & Reasoning (25 pts): Does the candidate demonstrate structured thinking and trade-off awareness?
- Communication Clarity (20 pts): Are answers clear, concise, and well-structured?
- Proactivity & Leadership Signals (15 pts): Does the candidate demonstrate ownership, initiative, or mentorship?

Based on your evaluation, provide the overall score, whether you recommend them to proceed, and point out skill gaps and a brief executive summary.
"""

class InterviewEvaluationSchema(BaseModel):
    overall_score: int
    is_recommended: bool
    skill_gaps: list[str]
    executive_summary: str

async def calculate_ai_score(interview_id, db: AsyncSession | None = None) -> int | None:
    """
    Fetch all transcripts for the given interview, call OpenAI to score them using structured outputs,
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

        response = await openai_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You are an expert technical evaluator parsing interview transcripts. Output ONLY valid JSON matching the requested schema. No markdown wrapping."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"}
        )
        
        import json
        parsed_dict = json.loads(response.choices[0].message.content)
        parsed = InterviewEvaluationSchema(**parsed_dict)
        score = parsed.overall_score

        interview = (await db.execute(
            select(Interview).where(Interview.id == interview_id)
        )).scalar_one_or_none()

        if interview:
            interview.ai_score = float(score)
            interview.status = InterviewStatus.completed
            await db.commit()

        return score

    except Exception as e:
        logger.error(f"Scoring engine error: {e}")
        if own_session:
            await db.rollback()
        return None
    finally:
        if own_session:
            await db.aclose()
