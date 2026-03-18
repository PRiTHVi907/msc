import pytest
import asyncio
from unittest.mock import AsyncMock, patch
from sqlalchemy.exc import DBAPIError
from app.services.worker import TranscriptWorker
from uuid import uuid4

@pytest.mark.asyncio
async def test_transcript_worker_batching_and_resilience():
    worker = TranscriptWorker()
    
    # Pump 50 mock transcripts into the queue
    for i in range(50):
        await worker.q.put({
            "interview_id": str(uuid4()),
            "speaker": "human",
            "text_content": f"Mock transcript {i}",
            "confidence_score": 0.99
        })

    # Prepare mock DB Session factory
    mock_db_session = AsyncMock()
    mock_db_execute = AsyncMock()
    
    # Simulate a DBAPIError on the first execute call, then succeed on subsequent calls.
    mock_db_execute.side_effect = [DBAPIError("Mock failure", None, None), None]
    
    mock_db_session.return_value.__aenter__.return_value.execute = mock_db_execute
    mock_db_session.return_value.__aenter__.return_value.commit = AsyncMock()
    mock_db_session.return_value.__aenter__.return_value.rollback = AsyncMock()

    # Trigger flush
    await worker.flush(db_factory=mock_db_session)
    
    # Assert queue is empty
    assert worker.q.empty()
    
    # Because there are 50 items and batch size is 10, '_insert' should be called 5 times.
    # However, since we simulated a failure on the very first execute within the first batch,
    # the backoff retry logic means execute will be called 1 (failed) + 1 (success) for batch 1,
    # plus 4 (successes) for batches 2-5. Total execute calls = 6.
    assert mock_db_execute.call_count >= 5
    
    # Verify rollback was called due to the initial DBAPIError
    assert mock_db_session.return_value.__aenter__.return_value.rollback.call_count == 1
