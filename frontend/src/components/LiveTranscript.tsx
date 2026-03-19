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
    <div className="mt-6 w-full max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-64">
      <div className="bg-gray-50 border-b border-gray-200 px-6 py-3 flex justify-between items-center text-sm font-semibold text-gray-700">
        <span>Live Transcript</span>
        <div className="flex items-center space-x-3">
          {isFollowup && (
            <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full flex items-center text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mr-1.5 animate-pulse" />
              Follow-up
            </span>
          )}
          <span className="text-gray-500 text-xs">Question {qNum} of 10</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {msgs.map((m, i) => (
          <div
            key={i}
            className={`flex flex-col ${m.speaker === 'ai' ? 'items-start' : 'items-end'} animate-fade-in-up`}
          >
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
              {m.speaker === 'ai' ? 'AI Interviewer' : 'You'}
            </span>
            <div
              className={`${
                m.speaker === 'ai'
                  ? 'bg-blue-50 text-blue-900 px-4 py-3 rounded-2xl rounded-tl-sm self-start max-w-[85%]'
                  : 'bg-gray-100 text-gray-800 px-4 py-3 rounded-2xl rounded-tr-sm self-end max-w-[85%] mt-2'
              }`}
            >
              <p className="text-sm leading-relaxed">{m.text}</p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
