import { useEffect, useRef, useState } from 'react';
import Video, { Room, Participant, Track, AudioTrack, VideoTrack, LocalAudioTrack, LocalVideoTrack } from 'twilio-video';
import { LiveTranscript } from './LiveTranscript';

export function LiveAIInterviewRoom({ token, roomName, interviewId, jwtToken }: { token: string; roomName: string; interviewId: string; jwtToken: string }) {
  const [room, setRoom] = useState<Room | null>(null);
  const [aiJoined, setAiJoined] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const localVidRef = useRef<HTMLDivElement>(null);
  const remoteVidRef = useRef<HTMLDivElement>(null);

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
          } catch(e) {}
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

      } catch (err) { console.error('Twilio Connect Error:', err); }
    };
    init();

    return () => {
      if (mockStream) mockStream.getTracks().forEach(t => t.stop());
      if (activeRoom) { activeRoom.localParticipant.tracks.forEach(p => { if (p.track) { p.track.stop(); p.track.detach().forEach(el => el.remove()); } }); activeRoom.disconnect(); }
    };
  }, [token, roomName]);

  return (
    <div className="w-full flex flex-col items-center animate-fade-in relative max-w-5xl mx-auto mt-4">
      <div className="w-full bg-[#1A1A1A] rounded-2xl overflow-hidden aspect-video shadow-xl relative grid place-items-center">
        {!aiJoined && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0A2540] z-10">
            <div className="w-16 h-16 border-4 border-[#00D26A] border-t-transparent rounded-full animate-spin mb-4" />
            <h2 className="text-white text-xl font-medium">Waiting for AI Interviewer to join...</h2>
          </div>
        )}
        
        {/* Remote AI View Location (Video or Audio Visualizer) */}
        <div ref={remoteVidRef} className="w-full h-full object-cover">
          {aiJoined && <div className="w-full h-full flex items-center justify-center pointer-events-none"><div className="w-32 h-32 rounded-full bg-[#1D5A85]/20 animate-ping absolute"/><div className="w-24 h-24 rounded-full bg-[#1D5A85]/40 animate-pulse relative z-10" /></div>}
        </div>

        {/* Local Candidate Picture-in-Picture */}
        <div ref={localVidRef} className="absolute bottom-6 right-6 w-48 aspect-video bg-black rounded-xl overflow-hidden shadow-2xl ring-2 ring-white/20 z-20" />
      </div>

      {room && <LiveTranscript wsUrl={`ws://localhost:8000/ws/interviews/${interviewId}/stream`} token={jwtToken} />}
    </div>
  );
}
