import pytest
from unittest.mock import patch, AsyncMock
from uuid import uuid4

@pytest.mark.asyncio
@patch("app.api.interviews.retell_service.create_web_call")
async def test_join_interview_retell_mock(mock_create_call, async_client, db_session):
    # Mock external Retell SDK 
    mock_create_call.return_value = {
        "call_id": "mock_retell_call_id_123",
        "access_token": "mock_retell_access_token_xyz"
    }

    from app.models.models import User, Interview, Job
    user = User(email="test@example.com", full_name="User", password_hash="hash")
    job = Job(title="Dev", department="Eng", skills="Python", interview_type="live", min_score=70, questions=[], notifications={})
    db_session.add_all([user, job])
    await db_session.commit()
    
    interview = Interview(user_id=user.id, job_id=job.id)
    db_session.add(interview)
    await db_session.commit()

    from app.core.auth import create_access_token
    token = create_access_token({"sub": str(user.id)})
    
    response = await async_client.post(f"/api/v1/interviews/{str(interview.id)}/join", headers={"Authorization": f"Bearer {token}"})
    
    assert response.status_code == 200
    data = response.json()
    assert data["access_token"] == "mock_retell_access_token_xyz"
    assert data["retell_call_id"] == "mock_retell_call_id_123"

@pytest.mark.asyncio
async def test_webhook_malformed_payload(async_client):
    # Testing graceful failure on bad JSON payload (expecting 400 or 422, not 500)
    malformed_payload = '{"event": "call_ended", "data": { missing_quotes } }'
    
    response = await async_client.post(
        "/api/v1/webhooks/retell", 
        content=malformed_payload, 
        headers={"Content-Type": "application/json"}
    )
    
    assert response.status_code in [400, 422]
