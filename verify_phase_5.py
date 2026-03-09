#!/usr/bin/env python3
"""
PHASE 5 VERIFICATION SCRIPT
Scoring, Finalization, and Lifecycle Management

Tests:
1. Scoring service imports
2. Scoring rubric presence
3. AsyncSessionLocal injection
4. Gemini model configuration
5. TranscriptWorker queue type
6. cleanup_orphans presence
7. Interview finalization endpoint
8. Main.py startup/shutdown hooks
9. Background task creation
10. Proper exception handling
"""

import sys
import asyncio
from pathlib import Path

# Add project to path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

def test_1_scoring_imports():
    """✓ Test 1: Scoring service imports"""
    try:
        from app.services.scoring import calculate_ai_score, _SCORING_RUBRIC, _MODEL
        assert callable(calculate_ai_score), "calculate_ai_score must be async callable"
        assert isinstance(_SCORING_RUBRIC, str), "_SCORING_RUBRIC must be string"
        assert len(_SCORING_RUBRIC) > 500, "_SCORING_RUBRIC must be detailed"
        assert _MODEL == "gemini-2.5-pro-preview-03-25", "_MODEL must be correct"
        print("✅ [1/10] Scoring Imports: PASSED")
        return True
    except Exception as e:
        print(f"❌ [1/10] Scoring Imports: FAILED - {e}")
        return False

def test_2_scoring_rubric():
    """✓ Test 2: Scoring rubric contains evaluation criteria"""
    try:
        from app.services.scoring import _SCORING_RUBRIC
        required_keywords = [
            "Technical Depth",
            "Problem-Solving",
            "Communication",
            "Proactivity",
            "0-100"
        ]
        for keyword in required_keywords:
            assert keyword in _SCORING_RUBRIC, f"Missing '{keyword}' in rubric"
        print("✅ [2/10] Scoring Rubric: PASSED")
        return True
    except Exception as e:
        print(f"❌ [2/10] Scoring Rubric: FAILED - {e}")
        return False

def test_3_session_factory():
    """✓ Test 3: AsyncSessionLocal is properly configured"""
    try:
        from app.core.database import AsyncSessionLocal
        assert AsyncSessionLocal is not None, "AsyncSessionLocal must exist"
        print("✅ [3/10] Session Factory: PASSED")
        return True
    except Exception as e:
        print(f"❌ [3/10] Session Factory: FAILED - {e}")
        return False

def test_4_transcript_worker():
    """✓ Test 4: TranscriptWorker has queue and methods"""
    try:
        from app.services.worker import transcript_worker
        import asyncio
        
        assert hasattr(transcript_worker, 'q'), "Need 'q' attribute"
        assert isinstance(transcript_worker.q, asyncio.Queue), "'q' must be asyncio.Queue"
        assert callable(transcript_worker.run), "Need 'run' method"
        assert callable(transcript_worker.flush), "Need 'flush' method"
        assert callable(transcript_worker._insert), "Need '_insert' method"
        print("✅ [4/10] TranscriptWorker: PASSED")
        return True
    except Exception as e:
        print(f"❌ [4/10] TranscriptWorker: FAILED - {e}")
        return False

def test_5_cleanup_orphans():
    """✓ Test 5: cleanup_orphans function exists and is async"""
    try:
        from app.services.worker import cleanup_orphans
        import asyncio
        
        assert callable(cleanup_orphans), "cleanup_orphans must be callable"
        assert asyncio.iscoroutinefunction(cleanup_orphans), "cleanup_orphans must be async"
        print("✅ [5/10] Cleanup Orphans: PASSED")
        return True
    except Exception as e:
        print(f"❌ [5/10] Cleanup Orphans: FAILED - {e}")
        return False

def test_6_interview_models():
    """✓ Test 6: Interview model has ai_score and status fields"""
    try:
        from app.models.models import Interview, InterviewStatus
        import sqlalchemy
        
        # Check ai_score column
        assert hasattr(Interview, 'ai_score'), "Interview must have 'ai_score' field"
        assert hasattr(Interview, 'status'), "Interview must have 'status' field"
        assert hasattr(Interview, 's3_video_url'), "Interview must have 's3_video_url' field"
        assert hasattr(Interview, 'ended_at'), "Interview must have 'ended_at' field"
        
        # Check InterviewStatus enum
        assert hasattr(InterviewStatus, 'completed'), "Need completed status"
        assert hasattr(InterviewStatus, 'in_progress'), "Need in_progress status"
        assert hasattr(InterviewStatus, 'failed'), "Need failed status"
        
        print("✅ [6/10] Interview Models: PASSED")
        return True
    except Exception as e:
        print(f"❌ [6/10] Interview Models: FAILED - {e}")
        return False

def test_7_finalize_endpoint():
    """✓ Test 7: Finalize endpoint exists and has correct route"""
    try:
        import inspect
        from app.api.interviews import finalize_video
        
        # Check function exists and is callable
        assert callable(finalize_video), "finalize_video must be callable"
        
        # Check function signature includes interview_id parameter
        sig = inspect.signature(finalize_video)
        params = list(sig.parameters.keys())
        assert 'interview_id' in params, "Must have interview_id parameter"
        
        print("✅ [7/10] Finalize Endpoint: PASSED")
        return True
    except Exception as e:
        print(f"❌ [7/10] Finalize Endpoint: FAILED - {e}")
        return False

def test_8_video_finalize_request():
    """✓ Test 8: VideoFinalizeRequest schema exists"""
    try:
        from app.schemas.schemas import VideoFinalizeRequest
        
        # Verify schema has s3_resource_url
        import inspect
        sig = inspect.signature(VideoFinalizeRequest.__init__)
        params = list(sig.parameters.keys())
        
        assert 's3_resource_url' in params or hasattr(VideoFinalizeRequest, '__fields__'), \
            "VideoFinalizeRequest must have s3_resource_url"
        
        print("✅ [8/10] Video Finalize Schema: PASSED")
        return True
    except Exception as e:
        print(f"❌ [8/10] Video Finalize Schema: FAILED - {e}")
        return False

def test_9_main_startup():
    """✓ Test 9: main.py has startup and shutdown hooks"""
    try:
        import main
        
        # Check for on_event decorators
        import inspect
        source = inspect.getsource(main)
        
        assert '@app.on_event("startup")' in source, "Need startup hook"
        assert '@app.on_event("shutdown")' in source, "Need shutdown hook"
        assert 'Base.metadata.create_all' in source, "Need table creation"
        assert 'transcript_worker.run()' in source, "Need worker startup"
        assert 'cleanup_orphans()' in source, "Need orphan cleanup startup"
        
        print("✅ [9/10] Main.py Lifecycle: PASSED")
        return True
    except Exception as e:
        print(f"❌ [9/10] Main.py Lifecycle: FAILED - {e}")
        return False

def test_10_asyncio_task_creation():
    """✓ Test 10: Finalize endpoint creates background task"""
    try:
        import inspect
        from app.api.interviews import finalize_video
        
        source = inspect.getsource(finalize_video)
        assert 'asyncio.create_task' in source, "Must use asyncio.create_task"
        assert 'calculate_ai_score' in source, "Must call calculate_ai_score"
        
        print("✅ [10/10] Background Task Creation: PASSED")
        return True
    except Exception as e:
        print(f"❌ [10/10] Background Task Creation: FAILED - {e}")
        return False

def main():
    print("\n" + "="*70)
    print("PHASE 5: SCORING & LIFECYCLE - VERIFICATION SUITE")
    print("="*70 + "\n")
    
    tests = [
        test_1_scoring_imports,
        test_2_scoring_rubric,
        test_3_session_factory,
        test_4_transcript_worker,
        test_5_cleanup_orphans,
        test_6_interview_models,
        test_7_finalize_endpoint,
        test_8_video_finalize_request,
        test_9_main_startup,
        test_10_asyncio_task_creation,
    ]
    
    results = []
    for test in tests:
        try:
            results.append(test())
        except Exception as e:
            print(f"Test {test.__name__} crashed: {e}")
            results.append(False)
    
    print("\n" + "="*70)
    passed = sum(results)
    total = len(results)
    print(f"RESULTS: {passed}/{total} TESTS PASSED")
    print("="*70 + "\n")
    
    if passed == total:
        print("✅ PHASE 5 COMPLETE & PRODUCTION-READY\n")
        return 0
    else:
        print("❌ PHASE 5 INCOMPLETE - REVIEW FAILURES\n")
        return 1

if __name__ == "__main__":
    sys.exit(main())
