import { useState, useEffect, useRef } from 'react';

interface TranscriptEntry {
  id: string;
  speaker: string;
  text: string;
  timestamp: number;
}

interface Msg { speaker: 'ai' | 'human'; text: string; }

export function LiveTranscript({
  transcript,
  wsUrl,
  token,
  localStream,
}: {
  transcript?: TranscriptEntry[];
  wsUrl?: string;
  token?: string;
  localStream?: MediaStream | null;
}) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [qNum, setQNum] = useState(1);
  const [isFollowup, setIsFollowup] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // If transcript prop is provided (Phase 4 usage), use it directly
  useEffect(() => {
    if (transcript && transcript.length > 0) {
      const newMsgs: Msg[] = transcript.map(entry => ({
        speaker: (entry.speaker.toLowerCase() === 'ai' ? 'ai' : 'human') as 'ai' | 'human',
        text: entry.text
      }));
      setMsgs(newMsgs);
    }
  }, [transcript]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs]);

  return (
    <div className="w-full max-w-4xl mx-auto bg-white border rounded-xl overflow-hidden shadow-sm flex flex-col h-64">
      <div className="bg-gray-50 border-b p-3 flex justify-between items-center">
        <span className="font-semibold text-[#0A2540]">Live Transcript</span>
        <div className="flex items-center space-x-3 text-sm font-medium">
          {isFollowup && (
            <span className="bg-[#1D5A85]/10 text-[#1D5A85] px-2 py-0.5 rounded-full flex items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1D5A85] mr-1.5 animate-pulse" />
              Follow-up
            </span>
          )}
          <span className="text-[#8792A2]">Question {qNum} of 10</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {msgs.map((m, i) => (
          <div
            key={i}
            className={`p-3 rounded-lg max-w-[85%] ${
              m.speaker === 'ai'
                ? 'bg-[#0A2540]/5 border border-[#0A2540]/10 text-[#0A2540] self-start'
                : 'bg-gray-50 text-[#1A1A1A] self-end ml-auto'
            }`}
          >
            <span className="text-xs font-bold uppercase tracking-wider opacity-60 block mb-1">
              {m.speaker === 'ai' ? 'AI Interviewer' : 'You'}
            </span>
            <p className="text-sm">{m.text}</p>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
