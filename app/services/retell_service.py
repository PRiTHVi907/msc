import logging
from typing import Dict, List
from retell import Retell
from app.core.config import settings

logger = logging.getLogger(__name__)

class RetellService:
    def __init__(self):
        self.client = Retell(api_key=settings.RETELL_API_KEY)

    def create_web_call(self, interview_id: str, candidate_name: str, job_title: str, required_skills: List[str]) -> Dict[str, str]:
        dynamic_variables = {
            "candidate_name": candidate_name,
            "job_title": job_title,
            "required_skills": ", ".join(required_skills)
        }
        
        try:
            logger.info(f"Creating fresh Retell call for interview {interview_id}...")
            call = self.client.call.create_web_call(
                agent_id=settings.RETELL_AGENT_ID,
                retell_llm_dynamic_variables=dynamic_variables,
                metadata={"interview_id": interview_id}
            )
            logger.info(f"SUCCESS: Call ID {call.call_id} generated!")
            return {
                "access_token": call.access_token,
                "call_id": call.call_id
            }
        except Exception as e:
            if "your_" in settings.RETELL_API_KEY or "dummy" in settings.RETELL_API_KEY:
                return {
                    "access_token": "fallback_local_access_token",
                    "call_id": f"fallback_call_id_{interview_id}"
                }
            raise e

# A single configured instance can be exported or recreated as needed
retell_service = RetellService()
