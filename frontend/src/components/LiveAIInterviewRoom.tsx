import { useEffect, useState, useCallback } from 'react';
import { RetellWebClient } from 'retell-client-js-sdk';
import { LiveTranscript } from './LiveTranscript';

interface TranscriptEntry {
  id: string;
  speaker: string;
  text: string;
  timestamp: number;
}

const retellWebClient = new RetellWebClient();

export function LiveAIInterviewRoom({ access_token }: { access_token: string }) {
  const [isCalling, setIsCalling] = useState(false);
  const [agentSpeaking, setAgentSpeaking] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState<TranscriptEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Setup Retell Event Listeners
    retellWebClient.on('call_started', () => {
      console.log('Call started');
      setIsCalling(true);
      setError(null);
    });

    retellWebClient.on('call_ended', () => {
      console.log('Call ended');
      setIsCalling(false);
      setAgentSpeaking(false);
    });

    retellWebClient.on('agent_start_talking', () => {
      setAgentSpeaking(true);
    });

    retellWebClient.on('agent_stop_talking', () => {
      setAgentSpeaking(false);
    });

    retellWebClient.on('update', (update) => {
      // Transcript update logic
      if (update && update.transcript) {
        // Map the Retell transcript format to our local format
        const entries = update.transcript.map((t: any, idx: number) => ({
          id: `ts-${idx}`,
          speaker: t.role === 'agent' ? 'AI' : 'Candidate',
          text: t.content,
          timestamp: Date.now() // Retell UI doesn't always provide timestamp mapping cleanly, stub for now
        }));
        setLiveTranscript(entries);
      }
    });

    retellWebClient.on('error', (err) => {
      console.error('An error occurred:', err);
      setError('An error occurred during the call.');
      setIsCalling(false);
    });

    return () => {
      // Clean up listeners on unmount
      retellWebClient.off('call_started');
      retellWebClient.off('call_ended');
      retellWebClient.off('agent_start_talking');
      retellWebClient.off('agent_stop_talking');
      retellWebClient.off('update');
      retellWebClient.off('error');
    };
  }, []);

  const toggleConversation = async () => {
    if (isCalling) {
      retellWebClient.stopCall();
      setIsCalling(false);
    } else {
      if (!access_token) {
        setError("Invalid access token.");
        return;
      }
      try {
        await retellWebClient.startCall({
          accessToken: access_token,
        });
      } catch (err) {
        console.error('Failed to start call:', err);
        setError('Failed to connect to the agent.');
      }
    }
  };

  return (
    <div className="w-full flex flex-col items-center animate-fade-in relative max-w-5xl mx-auto mt-4">
      {error && (
        <div className="w-full bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      <div className="w-full bg-[#1A1A1A] rounded-2xl overflow-hidden aspect-video shadow-xl relative grid place-items-center mb-6">
        
        {/* Call Content Area */}
        <div className="flex flex-col items-center justify-center z-10 w-full h-full">

          {/* Avatar / Visuals */}
          <div className="relative mb-8 mt-4">
            <div className={`w-32 h-32 rounded-full border-4 shadow-xl flex items-center justify-center transition-all duration-300 ${
              isCalling 
                ? (agentSpeaking ? 'border-[#00D26A] bg-[#00D26A]/10 scale-105 shadow-[0_0_30px_rgba(0,210,106,0.3)]' : 'border-[#1D5A85] bg-[#1D5A85]/10') 
                : 'border-gray-600 bg-gray-800 opacity-50'
            }`}>
              {/* Agent pulsating rings */}
              {agentSpeaking && (
                <div className="absolute inset-0 rounded-full animate-ping opacity-30 bg-[#00D26A]" />
              )}
              {/* Central avatar icon */}
              <div className="w-20 h-20 bg-black/50 rounded-full flex items-center justify-center backdrop-blur-sm">
                <span className="text-4xl">🤖</span>
              </div>
            </div>
          </div>

          {/* Status Message */}
          <h2 className="text-white text-xl font-medium mb-8 min-h-[30px]">
            {!isCalling ? "Ready for your interview" : 
              (agentSpeaking ? "AI is speaking..." : "Listening...")}
          </h2>

          {/* Main Controls */}
          <button
            onClick={toggleConversation}
            className={`px-8 py-4 rounded-full font-bold text-lg shadow-xl hover:scale-105 transition-all outline-none ${
              isCalling
                ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/20'
                : 'bg-white hover:bg-gray-100 text-[#0A2540] shadow-white/10'
            }`}
          >
            {isCalling ? 'End Interview' : 'Connect / Start Interview'}
          </button>
        </div>

        {/* Status Indicators overlay */}
        <div className="absolute top-4 left-4 flex gap-3 z-20">
          <div className={`px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-sm ${
            isCalling ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-gray-500/20 text-gray-300 border border-gray-500/30'
          }`}>
            {isCalling ? '🟢 Connected' : '🔴 Disconnected'}
          </div>
        </div>
      </div>

      {/* Transcript Area */}
      {isCalling && liveTranscript.length > 0 && (
        <div className="w-full mt-2 bg-black/20 rounded-xl p-4 border border-white/5">
          <h3 className="text-white/50 text-sm font-semibold uppercase tracking-wider mb-4 px-2">Live Transcript</h3>
          <div className="w-full h-64 overflow-y-auto pr-2 custom-scrollbar">
            <LiveTranscript transcript={liveTranscript} />
          </div>
        </div>
      )}
    </div>
  );
}
