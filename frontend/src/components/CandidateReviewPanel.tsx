import { useState, useRef, useMemo } from 'react';
import { Play, Pause, MessageSquare, Send, CheckCircle2 } from 'lucide-react';

interface TranscriptItem { start: number; text: string; speaker: 'ai' | 'candidate'; }
interface ScoreCategory { name: string; score: number; }
interface Comment { id: string; author: string; time: number; text: string; }

const mockTranscript: TranscriptItem[] = [
  { start: 0, speaker: 'ai', text: "Welcome. Can you explain a time you optimized a slow React application?" },
  { start: 5.2, speaker: 'candidate', text: "Sure. We had a dashboard rendering 5000 rows. I implemented windowing using react-window." },
  { start: 12.1, speaker: 'candidate', text: "I also memoized the row components and moved heavy state to Zustand, dropping render times by 80%." }
];

const mockScores: ScoreCategory[] = [
  { name: 'Technical Depth', score: 92 },
  { name: 'Communication', score: 85 },
  { name: 'Problem Solving', score: 90 }
];

export function CandidateReviewPanel() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [statusHover, setStatusHover] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const totalScore = Math.round(mockScores.reduce((acc, s) => acc + s.score, 0) / mockScores.length);

  const formatTime = (sec: number) => {
    const min = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${min}:${s.toString().padStart(2, '0')}`;
  };

  const handleTimeUpdate = () => setCurrentTime(videoRef.current?.currentTime || 0);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause(); else videoRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const jumpTo = (time: number) => {
    if (videoRef.current) { videoRef.current.currentTime = time; setCurrentTime(time); }
  };

  const addComment = () => {
    if (!newComment.trim()) return;
    setComments([...comments, { id: Date.now().toString(), author: 'HR Reviewer', time: currentTime, text: newComment }]);
    setNewComment('');
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      {/* Left Column: Video & Collaboration */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-black rounded-xl overflow-hidden aspect-video relative shadow-lg group">
          <video ref={videoRef} onTimeUpdate={handleTimeUpdate} src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4" className="w-full h-full object-cover" />
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent flex items-center space-x-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={togglePlay} className="text-white hover:text-[#00D26A] transition-colors">{isPlaying ? <Pause size={24}/> : <Play size={24}/>}</button>
            <div className="flex-1 h-2 bg-gray-600 rounded-full cursor-pointer relative" onClick={(e) => jumpTo((e.nativeEvent.offsetX / e.currentTarget.offsetWidth) * (videoRef.current?.duration || 100))}>
              <div className="absolute top-0 left-0 h-full bg-[#00D26A] rounded-full pointer-events-none" style={{ width: `${(currentTime / (videoRef.current?.duration || 100)) * 100}%` }} />
              {comments.map(c => (
                <div key={c.id} className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-yellow-400 rounded-full cursor-pointer hover:scale-150 transition-transform" style={{ left: `${(c.time / (videoRef.current?.duration || 100)) * 100}%` }} title={c.text} />
              ))}
            </div>
            <span className="text-white text-sm font-mono">{formatTime(currentTime)}</span>
          </div>
        </div>

        {/* Collaboration Thread */}
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <h3 className="text-lg font-bold text-[#0A2540] flex items-center mb-4"><MessageSquare size={18} className="mr-2" /> Team Comments</h3>
          <div className="space-y-4 mb-4 max-h-64 overflow-y-auto">
            {comments.length === 0 ? <p className="text-[#8792A2] text-sm italic">No comments yet. Leave a timestamped note below.</p> : comments.map(c => (
              <div key={c.id} className="flex space-x-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                <div className="w-8 h-8 rounded-full bg-[#1D5A85] text-white flex items-center justify-center font-bold text-xs shrink-0">{c.author[0]}</div>
                <div>
                  <div className="flex items-center space-x-2"><span className="font-semibold text-sm text-[#1A1A1A]">{c.author}</span><button onClick={() => jumpTo(c.time)} className="text-xs text-[#1D5A85] hover:underline font-mono">@{formatTime(c.time)}</button></div>
                  <p className="text-sm text-[#4A5568] mt-1">{c.text}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex space-x-2">
            <input type="text" value={newComment} onChange={e => setNewComment(e.target.value)} onKeyDown={e => e.key === 'Enter' && addComment()} className="flex-1 p-3 border rounded-lg focus-ring text-sm" placeholder={`Add a note at ${formatTime(currentTime)}...`} />
            <button onClick={addComment} disabled={!newComment.trim()} className="bg-[#0A2540] hover:bg-[#113B5E] disabled:bg-gray-300 text-white p-3 rounded-lg focus-ring transition-colors"><Send size={18} /></button>
          </div>
        </div>
      </div>

      {/* Right Column: AI Analysis & Transcript */}
      <div className="space-y-6">
        
        {/* AI Scorecard Card */}
        <div className="bg-white p-6 rounded-xl border shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#0A2540] to-[#00D26A]" />
          <h3 className="font-bold text-[#0A2540] mb-6">Gemini AI Evaluation</h3>
          
          <div className="flex justify-center mb-6">
            <div className="relative w-32 h-32 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="64" cy="64" r="56" className="stroke-gray-100" strokeWidth="12" fill="none" />
                <circle cx="64" cy="64" r="56" className="stroke-[#00D26A]" strokeWidth="12" fill="none" strokeDasharray={`${(totalScore / 100) * 351} 351`} strokeLinecap="round" />
              </svg>
              <div className="absolute text-center">
                <span className="text-3xl font-black text-[#0A2540]">{totalScore}</span><span className="text-sm text-[#8792A2] block">/ 100</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {mockScores.map(s => (
              <div key={s.name}>
                <div className="flex justify-between text-sm mb-1"><span className="font-medium text-[#1A1A1A]">{s.name}</span><span className="text-[#8792A2] font-mono">{s.score}%</span></div>
                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-[#1D5A85] rounded-full" style={{ width: `${s.score}%` }} /></div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-[#F4F5F7] rounded-lg border border-gray-200">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#8792A2] mb-2">AI Summary</h4>
            <p className="text-sm text-[#1A1A1A] leading-relaxed">The candidate demonstrated exceptional knowledge of React performance optimization, specifically correctly identifying windowing logic. Communication was clear and structured.</p>
          </div>
        </div>

        {/* Sync Transcript */}
        <div className="bg-white p-6 rounded-xl border shadow-sm h-[400px] flex flex-col">
          <h3 className="font-bold text-[#0A2540] mb-4">Interactive Transcript</h3>
          <div className="flex-1 overflow-y-auto pr-2 space-y-2">
            {mockTranscript.map((t, i) => {
              const isActive = currentTime >= t.start && (i === mockTranscript.length - 1 || currentTime < mockTranscript[i+1].start);
              return (
                <div key={i} onClick={() => jumpTo(t.start)} className={`p-3 rounded-lg cursor-pointer transition-all ${isActive ? 'bg-[#0A2540]/5 border-[#0A2540]/20 border shadow-sm' : 'hover:bg-gray-50 border border-transparent'}`}>
                  <div className="flex justify-between items-center mb-1">
                    <span className={`text-xs font-bold uppercase ${t.speaker === 'ai' ? 'text-[#1D5A85]' : 'text-[#8792A2]'}`}>{t.speaker === 'ai' ? 'AI Interviewer' : 'Candidate'}</span>
                    <span className="text-xs font-mono text-gray-400">{formatTime(t.start)}</span>
                  </div>
                  <p className={`text-sm ${isActive ? 'text-[#1A1A1A] font-medium' : 'text-gray-600'}`}>{t.text}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Candidate Experience Action */}
        <button onMouseEnter={() => setStatusHover(true)} onMouseLeave={() => setStatusHover(false)} className="w-full relative overflow-hidden group bg-white border-2 border-[#0A2540] text-[#0A2540] hover:text-white p-4 rounded-xl font-bold transition-colors focus-ring flex items-center justify-center">
          <div className={`absolute inset-0 bg-[#0A2540] transition-transform duration-300 origin-left ${statusHover ? 'scale-x-100' : 'scale-x-0'}`} />
          <span className="relative z-10 flex items-center"><CheckCircle2 className="mr-2" size={20} /> Advance to Next Round & Notify</span>
        </button>

      </div>
    </div>
  );
}
