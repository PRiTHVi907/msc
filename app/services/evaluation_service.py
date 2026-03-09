import os
from pydantic import BaseModel, Field
from google import genai
from google.genai import types

class CompetencyScore(BaseModel):
    skill_name: str
    score: int = Field(ge=0, le=100)
    justification: str

class CommunicationAssessment(BaseModel):
    clarity: int = Field(ge=1, le=10)
    conciseness: int = Field(ge=1, le=10)
    professionalism: int = Field(ge=1, le=10)

class InterviewEvaluationSchema(BaseModel):
    candidate_name: str
    overall_score: int = Field(ge=0, le=100)
    is_recommended: bool
    competency_breakdown: list[CompetencyScore]
    communication_assessment: CommunicationAssessment
    red_flags: list[str]
    executive_summary: str

class EvaluationService:
    def __init__(self):
        self.client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

    def generate_scorecard(self, transcript: str, rubric: dict) -> InterviewEvaluationSchema:
        prompt = f"""Act as a ruthless, objective auditor evaluating a technical interview.
You must grade the candidate precisely based on the following transcript and scoring rubric.
Deduct points heavily for evasive answers, lack of concrete examples (failing to use the STAR method), and failure to answer the specific follow-up questions asked. Ignore audio transcription errors (e.g., stuttering, 'ums', 'ahs') when grading technical accuracy; focus purely on the semantic content of the answers.

RUBRIC:
{rubric}

TRANSCRIPT:
{transcript}

Analyze the performance and return the strict JSON schema requested."""

        response = self.client.models.generate_content(
            model='gemini-2.5-pro',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=InterviewEvaluationSchema,
                temperature=0.1
            ),
        )
        return InterviewEvaluationSchema.model_validate_json(response.text)
