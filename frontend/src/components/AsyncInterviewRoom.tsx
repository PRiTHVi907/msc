import { useState, useEffect, useRef } from 'react';
import { useMediaRecorder } from '../hooks/useMediaRecorder';
import { SystemCheck } from './SystemCheck';

const Q = "Explain a complex technical problem you solved recently and how you approached it.";

export function AsyncInterviewRoom({ interviewId = '123' }: { interviewId?: string }) {
  const [checked, setChecked] = useState(false);
  const [timeLeft, setTimeLeft] = useState(120);
  const [retries, setRetries] = useState(2);
  const vidRef = useRef<HTMLVideoElement>(null);
  
  const { stream, isRecording, uploadProgress, startStream, stopStream, startRecording, stopRecording } = useMediaRecorder(interviewId);

  useEffect(() => {
    if (checked) { startStream().then(s => { if (vidRef.current) vidRef.current.srcObject = s; }); }
    return () => stopStream();
  }, [checked, startStream, stopStream]);

  useEffect(() => {
    let t: number;
    if (isRecording && timeLeft > 0) { t = window.setInterval(() => setTimeLeft(l => l - 1), 1000); }
    else if (timeLeft === 0 && isRecording) stopRecording();
    return () => clearInterval(t);
  }, [isRecording, timeLeft, stopRecording]);

  const handleRetry = () => { if (retries > 0) { setRetries(r => r - 1); setTimeLeft(120); stopRecording(); } };

  if (!checked) return <SystemCheck onComplete={() => setChecked(true)} />;

  return (
    <div className="w-full flex flex-col items-center animate-fade-in relative">
      {uploadProgress > 0 && uploadProgress < 100 && (
         <div className="absolute top-0 left-0 right-0 h-1 bg-gray-100 rounded-t-xl overflow-hidden"><div className="h-full bg-[#1D5A85] transition-all duration-300" style={{ width: `${uploadProgress}%` }}/></div>
      )}
      
      <div className="text-center w-full max-w-3xl mb-8 mt-4">
        <h1 className="text-3xl font-bold text-[#0A2540]">{Q}</h1>
        <div className="flex justify-center space-x-6 mt-4 text-[#8792A2] font-medium">
          <span>Time Limit: 02:00</span>
          <span>Retries: {retries} remaining</span>
        </div>
      </div>

      <div className="relative w-full max-w-4xl bg-black rounded-2xl overflow-hidden aspect-video shadow-lg ring-1 ring-gray-200">
        <video ref={vidRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
        
        {isRecording && (
          <div className="absolute top-4 right-4 bg-black/60 backdrop-blur px-4 py-2 rounded-lg border border-red-500/30 flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <span className="text-white font-mono font-bold">{Math.floor(timeLeft / 60).toString().padStart(2, '0')}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
          </div>
        )}

        <div className="absolute bottom-8 left-0 right-0 flex justify-center items-end space-x-4">
          {!isRecording ? (
            <button onClick={startRecording} className="px-8 py-4 bg-[#00D26A] hover:bg-[#00A352] text-white font-bold rounded-full text-lg shadow-xl hover:scale-105 transition-all focus-ring">Start Recording</button>
          ) : (
            <>
              <button disabled={retries === 0} onClick={handleRetry} className="px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur text-white font-semibold rounded-full border border-white/20 transition-all focus-ring disabled:opacity-50">Retry ({retries})</button>
              <button onClick={stopRecording} className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-full text-lg shadow-xl transition-all focus-ring">Finish Recording</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
