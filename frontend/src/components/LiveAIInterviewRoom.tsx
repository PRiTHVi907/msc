import { useEffect, useRef, useState, useCallback } from 'react';
import Video, { Room, Participant, Track, AudioTrack, VideoTrack, LocalAudioTrack, LocalVideoTrack } from 'twilio-video';
import { useMicrophoneStream } from '../hooks/useMicrophoneStream';
import { useAudioEgress } from '../hooks/useAudioEgress';
import { LiveTranscript } from './LiveTranscript';

const SAMPLE_RATE = 16000;

interface TranscriptEntry {
  id: string;
  speaker: string;
  text: string;
  timestamp: number;
}

export function LiveAIInterviewRoom({ token, roomName, interviewId, jwtToken }: { token: string; roomName: string; interviewId: string; jwtToken: string }) {
  const [room, setRoom] = useState<Room | null>(null);
  const [aiJoined, setAiJoined] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState<TranscriptEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  const localVidRef = useRef<HTMLDivElement>(null);
  const remoteVidRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const { startRecording, stopRecording } = useMicrophoneStream(wsRef.current);
  const { initContext, enqueue, destroy: destroyAudioContext } = useAudioEgress();

  // Initialize WebSocket connection and setup M1/M2 handshake
  const initializeWebSocket = useCallback(async () => {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/interviews/${interviewId}/stream`;
      
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('[WebSocket] Connected');
        
        // M1: Send authentication message
        const authMessage = {
          type: 'authenticate',
          token: `Bearer ${jwtToken}`
        };
        ws.send(JSON.stringify(authMessage));
        console.log('[WebSocket] M1 Auth sent');
      };

      ws.onmessage = (event) => {
        if (typeof event.data === 'string') {
          try {
            const msg = JSON.parse(event.data);
            
            if (msg.type === 'authenticated') {
              console.log('[WebSocket] M1 Authenticated');
              
              // M2: Send start stream message
              const startMessage = {
                type: 'start_stream',
                sample_rate: SAMPLE_RATE
              };
              ws.send(JSON.stringify(startMessage));
              console.log('[WebSocket] M2 Stream started');
              
              setWsConnected(true);
              setIsStreaming(true);
              
              // Initialize audio context
              initContext();
              
              // Start microphone recording
              startRecording();
            } else if (msg.type === 'transcript') {
              // Append transcript entry
              const entry: TranscriptEntry = {
                id: msg.id || `ts-${Date.now()}`,
                speaker: msg.speaker || 'Unknown',
                text: msg.text_content || '',
                timestamp: msg.timestamp || Date.now()
              };
              setLiveTranscript(prev => [...prev, entry]);
              console.log(`[Transcript] ${entry.speaker}: ${entry.text}`);
            }
          } catch (err) {
            console.error('[WebSocket] JSON parse error:', err);
          }
        } else if (event.data instanceof ArrayBuffer) {
          // Binary audio data from Gemini AI
          enqueue(event.data);
        }
      };

      ws.onerror = (event) => {
        console.error('[WebSocket] Error:', event);
        setError('WebSocket connection error');
        setWsConnected(false);
      };

      ws.onclose = () => {
        console.log('[WebSocket] Closed');
        setWsConnected(false);
        setIsStreaming(false);
        stopRecording();
        destroyAudioContext();
      };

      wsRef.current = ws;
    } catch (err) {
      console.error('[WebSocket] Initialization error:', err);
      setError('Failed to initialize WebSocket');
    }
  }, [interviewId, jwtToken, initContext, startRecording, stopRecording, destroyAudioContext, enqueue]);

  // Twilio Video setup
  useEffect(() => {
    let activeRoom: Room;
    let mockStream: MediaStream | null = null;
    
    const init = async () => {
      try {
        if (token === 'mock_token') {
          setRoom({} as Room);
          setAiJoined(true);
          try {
            mockStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            setLocalStream(mockStream);
            mockStream.getAudioTracks().forEach(t => {
              console.log(`[DEBUG - FRONTEND MIC] Audio track status: ${t.enabled ? 'active' : 'muted'}, readyState: ${t.readyState}`);
            });
            if (localVidRef.current) {
              const video = document.createElement('video');
              video.srcObject = mockStream;
              video.autoplay = true;
              video.muted = true;
              video.className = "w-full h-full object-cover";
              localVidRef.current.appendChild(video);
            }
          } catch(e) {
            console.error('Mock stream error:', e);
          }
          return;
        }

        activeRoom = await Video.connect(token, { name: roomName, audio: true, video: { width: 640 } });
        setRoom(activeRoom);
        
        // Attach Local Tracks
        const currentStream = new MediaStream();
        activeRoom.localParticipant.tracks.forEach(pub => {
          const t = pub.track as LocalAudioTrack | LocalVideoTrack;
          if (t.kind === 'audio') {
            console.log(`[DEBUG - FRONTEND MIC] Audio track status: ${t.mediaStreamTrack.enabled ? 'active' : 'muted'}, readyState: ${t.mediaStreamTrack.readyState}`);
            currentStream.addTrack(t.mediaStreamTrack);
          }
          if (t.kind === 'video') {
            currentStream.addTrack(t.mediaStreamTrack);
            if (localVidRef.current) localVidRef.current.appendChild(t.attach());
          }
        });
        setLocalStream(currentStream);

        // Remote Track Attachment handlers
        const attachTrack = (t: Track) => {
          if (t.kind === 'video' || t.kind === 'audio') {
            const el = (t as AudioTrack | VideoTrack).attach();
            if (remoteVidRef.current) remoteVidRef.current.appendChild(el);
          }
        };
        const detachTrack = (t: Track) => {
          if (t.kind === 'video' || t.kind === 'audio') {
            (t as AudioTrack | VideoTrack).detach().forEach(el => el.remove());
          }
        };

        const handleConnected = (p: Participant) => {
          setAiJoined(true);
          p.tracks.forEach(pub => { if (pub.isSubscribed && pub.track) attachTrack(pub.track); });
          p.on('trackSubscribed', attachTrack);
          p.on('trackUnsubscribed', detachTrack);
        };

        activeRoom.participants.forEach(handleConnected);
        activeRoom.on('participantConnected', handleConnected);
        activeRoom.on('participantDisconnected', () => setAiJoined(false));

      } catch (err) { 
        console.error('Twilio Connect Error:', err);
        setError('Failed to connect to video room');
      }
    };
    
    init();

    return () => {
      if (mockStream) mockStream.getTracks().forEach(t => t.stop());
      if (activeRoom) { 
        activeRoom.localParticipant.tracks.forEach(p => { 
          if (p.track) { 
            p.track.stop(); 
            p.track.detach().forEach(el => el.remove()); 
          } 
        }); 
        activeRoom.disconnect(); 
      }
    };
  }, [token, roomName]);

  // Initialize WebSocket after Twilio connects
  useEffect(() => {
    if (aiJoined && !wsConnected) {
      initializeWebSocket();
    }

    return () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
    };
  }, [aiJoined, wsConnected, initializeWebSocket]);

  return (
    <div className="w-full flex flex-col items-center animate-fade-in relative max-w-5xl mx-auto mt-4">
      {error && (
        <div className="w-full bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      <div className="w-full bg-[#1A1A1A] rounded-2xl overflow-hidden aspect-video shadow-xl relative grid place-items-center">
        {!aiJoined && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0A2540] z-10">
            <div className="w-16 h-16 border-4 border-[#00D26A] border-t-transparent rounded-full animate-spin mb-4" />
            <h2 className="text-white text-xl font-medium">Waiting for AI Interviewer to join...</h2>
          </div>
        )}
        
        {!wsConnected && aiJoined && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0A2540]/80 z-10">
            <div className="w-16 h-16 border-4 border-[#FFA500] border-t-transparent rounded-full animate-spin mb-4" />
            <h2 className="text-white text-xl font-medium">Initializing WebSocket...</h2>
          </div>
        )}
        
        {/* Remote AI View Location */}
        <div ref={remoteVidRef} className="w-full h-full object-cover">
          {aiJoined && wsConnected && (
            <div className="w-full h-full flex items-center justify-center pointer-events-none">
              <div className="w-32 h-32 rounded-full bg-[#1D5A85]/20 animate-ping absolute"/>
              <div className="w-24 h-24 rounded-full bg-[#1D5A85]/40 animate-pulse relative z-10" />
            </div>
          )}
        </div>

        {/* Status Indicators */}
        <div className="absolute top-4 left-4 flex gap-3 z-20">
          <div className={`px-3 py-1 rounded-full text-xs font-semibold ${wsConnected ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-300'}`}>
            {wsConnected ? '🟢 WS Connected' : '🔴 WS Disconnected'}
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-semibold ${isStreaming ? 'bg-blue-500/20 text-blue-300' : 'bg-gray-500/20 text-gray-300'}`}>
            {isStreaming ? '🎤 Streaming' : '⏹️ Not Streaming'}
          </div>
        </div>

        {/* Local Candidate Picture-in-Picture */}
        <div ref={localVidRef} className="absolute bottom-6 right-6 w-48 aspect-video bg-black rounded-xl overflow-hidden shadow-2xl ring-2 ring-white/20 z-20" />
      </div>

      {room && (
        <div className="w-full mt-6">
          <LiveTranscript transcript={liveTranscript} />
        </div>
      )}
    </div>
  );
}
