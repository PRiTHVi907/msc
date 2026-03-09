import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { LiveAIInterviewRoom } from '../components/LiveAIInterviewRoom';
import { AsyncInterviewRoom } from '../components/AsyncInterviewRoom';

export function InterviewSession() {
  const { token: interviewId } = useParams();
  const { jwtToken } = useAppStore();
  const [twilioToken, setTwilioToken] = useState<string | null>(null);
  const [roomName, setRoomName] = useState<string | null>(null);
  const [mode] = useState<'live' | 'async'>('live');
  const [error, setError] = useState('');

  // Guard against React Strict Mode double-invocation and duplicate concurrent calls
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!interviewId || !jwtToken) return;
    if (fetchedRef.current) return;  // already fetching or fetched
    fetchedRef.current = true;

    const fetchToken = async () => {
      try {
        const res = await fetch(`http://localhost:8000/api/v1/interviews/${interviewId}/join`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${jwtToken}`,
            'Content-Type': 'application/json',
          },
        });
        if (!res.ok) throw new Error('Failed to join room. ' + await res.text());
        const data = await res.json();
        setTwilioToken(data.token);
        setRoomName(data.room_name);
      } catch (err: any) {
        setError(err.message);
        fetchedRef.current = false; // allow retry on error
      }
    };

    fetchToken();
  }, [interviewId, jwtToken]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <h2 className="text-red-500 font-bold text-xl mb-2">Error Joining Session</h2>
        <p className="text-gray-600">{error}</p>
        <button
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
          onClick={() => { fetchedRef.current = false; setError(''); }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (mode === 'async') {
    return <AsyncInterviewRoom interviewId={interviewId} />;
  }

  if (!twilioToken || !roomName) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-gray-600 font-medium">Provisioning secure room...</p>
      </div>
    );
  }

  return <LiveAIInterviewRoom token={twilioToken} roomName={roomName} interviewId={interviewId!} jwtToken={jwtToken!} />;
}
