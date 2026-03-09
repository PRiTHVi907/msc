import { useState, useEffect, useRef } from 'react';

import { useMicrophoneStream } from '../hooks/useMicrophoneStream';

interface Msg { type: string; id?: number; is_followup?: boolean; text?: string; speaker?: 'ai' | 'human'; }

export function LiveTranscript({ wsUrl, token }: { wsUrl: string; token: string }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [qNum, setQNum] = useState(1);
  const [isFollowup, setIsFollowup] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  
  const [ws, setWs] = useState<WebSocket | null>(null);
  const { startRecording, stopRecording } = useMicrophoneStream(ws);

  useEffect(() => {
    const socket = new WebSocket(wsUrl);
    setWs(socket);
    
    socket.onopen = () => {
      console.log('[DEBUG - FRONTEND WS] Connection opened');
      socket.send(JSON.stringify({ type: 'authenticate', token }));
      socket.send(JSON.stringify({ type: 'start_stream', sample_rate: 16000 }));
      startRecording();
    };
    
    socket.onclose = () => {
      console.log(`[DEBUG - FRONTEND WS] Connection closed`);
      stopRecording();
    };
    socket.onerror = (err) => console.log('[DEBUG - FRONTEND WS] Error:', err);

    socket.onmessage = (e) => {
      console.log("[DEBUG - FRONTEND INGRESS] Received payload from backend:", e.data);
      try {
        const d: Msg = JSON.parse(e.data);
        if (d.type === 'question') { 
          setQNum(d.id || 1); 
          setIsFollowup(!!d.is_followup); 
        }
        else if (d.type === 'transcript') {
          console.log("[DEBUG - STATE] Updating transcript state with:", d.text);
          setMsgs(p => [...p, d]);
        }
        else if (d.type === 'ai_response') {
          const aiText = (d as any).transcript;
          console.log("[DEBUG - STATE] Updating transcript state with ai_response:", aiText);
          setMsgs(p => [...p, { type: 'transcript', speaker: 'ai', text: aiText }]);
        }
      } catch (err) {
        console.error("[DEBUG - FRONTEND ERROR] Failed to parse JSON payload:", err);
      }
    };
    
    return () => {
      stopRecording();
      socket.close();
    };
  }, [wsUrl, token, startRecording, stopRecording]);

  useEffect(() => {
    console.log("[DEBUG - RENDER] Transcript component re-rendered. Current array length:", msgs.length);
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs]);

  return (
    <div className="w-full max-w-4xl mx-auto bg-white border rounded-xl overflow-hidden shadow-sm flex flex-col h-64 mt-4">
      <div className="bg-gray-50 border-b p-3 flex justify-between items-center">
        <span className="font-semibold text-[#0A2540]">Live Transcript</span>
        <div className="flex items-center space-x-3 text-sm font-medium">
          {isFollowup && <span className="bg-[#1D5A85]/10 text-[#1D5A85] px-2 py-0.5 rounded-full flex items-center"><span className="w-1.5 h-1.5 rounded-full bg-[#1D5A85] mr-1.5 animate-pulse"/>Follow-up</span>}
          <span className="text-[#8792A2]">Question {qNum} of 10</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {msgs.map((m, i) => (
          <div key={i} className={`p-3 rounded-lg max-w-[85%] ${m.speaker === 'ai' ? 'bg-[#0A2540]/5 border border-[#0A2540]/10 text-[#0A2540] self-start' : 'bg-gray-50 text-[#1A1A1A] self-end ml-auto'}`}>
            <span className="text-xs font-bold uppercase tracking-wider opacity-60 block mb-1">{m.speaker === 'ai' ? 'AI Interviewer' : 'You'}</span>
            <p className="text-sm">{m.text}</p>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
