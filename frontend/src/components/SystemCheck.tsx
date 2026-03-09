import { useState, useRef, useEffect } from 'react';
import { Video, Mic, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export function SystemCheck({ onComplete }: { onComplete: () => void }) {
  const [cam, setCam] = useState<boolean | null>(null);
  const [mic, setMic] = useState<boolean | null>(null);
  const [net, setNet] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let af: number;
    let actx: AudioContext;
    const init = async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        streamRef.current = s;
        setCam(true); setMic(true);
        if (videoRef.current) videoRef.current.srcObject = s;
        
        actx = new AudioContext();
        const src = actx.createMediaStreamSource(s);
        const anl = actx.createAnalyser();
        anl.fftSize = 256;
        src.connect(anl);
        const data = new Uint8Array(anl.frequencyBinCount);
        
        const draw = () => {
          anl.getByteFrequencyData(data);
          const ctx = canvasRef.current?.getContext('2d');
          if (ctx && canvasRef.current) {
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            const sum = data.reduce((a, b) => a + b, 0);
            const avg = sum / data.length;
            ctx.fillStyle = '#00D26A';
            ctx.fillRect(0, 0, (avg / 255) * canvasRef.current.width, canvasRef.current.height);
          }
          af = requestAnimationFrame(draw);
        };
        draw();
        
        setTimeout(() => setNet(true), 2000); // Simulate network check
      } catch (e) { setCam(false); setMic(false); }
    };
    init();
    return () => { cancelAnimationFrame(af); actx?.close(); streamRef.current?.getTracks().forEach(t => t.stop()); };
  }, []);

  const allGood = cam && mic && net;

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl border shadow-sm animate-fade-in">
      <h2 className="text-2xl font-bold text-[#0A2540] mb-6 text-center">System Requirements Check</h2>
      
      <div className="relative bg-[#1A1A1A] rounded-xl overflow-hidden aspect-video mb-8">
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        <div className="absolute bottom-4 left-4 right-4 bg-black/50 backdrop-blur-sm rounded-lg p-3 border border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/70 font-medium">Mic Input</span>
            <canvas ref={canvasRef} width="100" height="8" className="bg-white/10 rounded-full overflow-hidden" />
          </div>
        </div>
      </div>

      <div className="space-y-4 mb-8">
        {[ { l: 'Camera Access', s: cam, i: Video }, { l: 'Microphone Check', s: mic, i: Mic }, { l: 'Network Bandwidth', s: net, i: CheckCircle } ].map((c, i) => (
          <div key={i} className={`flex items-center justify-between p-4 rounded-lg border ${c.s ? 'bg-green-50 border-green-100' : c.s === false ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
            <div className="flex items-center space-x-3 text-[#1A1A1A]"><c.i size={20} className={c.s ? 'text-[#00D26A]' : c.s === false ? 'text-red-500' : 'text-[#8792A2]'} /><span className="font-medium">{c.l}</span></div>
            {c.s ? <CheckCircle size={20} className="text-[#00D26A]" /> : c.s === false ? <AlertCircle size={20} className="text-red-500" /> : <Loader2 size={20} className="text-[#8792A2] animate-spin" />}
          </div>
        ))}
      </div>

      <button disabled={!allGood} onClick={onComplete} className="w-full py-4 bg-[#0A2540] disabled:bg-gray-300 disabled:text-gray-500 text-white rounded-lg font-bold transition-transform hover:scale-105 focus-ring">Continue to Interview</button>
    </div>
  );
}
