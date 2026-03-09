import { useState, useRef, useCallback } from 'react';
import { getPresignedUrl, uploadVideoChunk } from '../services/uploadService';

export function useMediaRecorder(interviewId: string) {
  const [isRecording, setIsRecording] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunkIndex = useRef(0);
  const totalChunks = useRef(0);
  const uploadedChunks = useRef(0);

  const startStream = useCallback(async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setStream(s);
      return s;
    } catch (e) { console.error('Device access denied', e); throw e; }
  }, []);

  const stopStream = useCallback(() => {
    stream?.getTracks().forEach(t => t.stop());
    setStream(null);
  }, [stream]);

  const startRecording = useCallback(() => {
    if (!stream) return;
    chunkIndex.current = 0;
    totalChunks.current = 0;
    uploadedChunks.current = 0;
    setUploadProgress(0);
    
    const mr = new MediaRecorder(stream, { mimeType: 'video/webm' });
    mr.ondataavailable = async (e) => {
      if (e.data.size > 0) {
        const idx = chunkIndex.current++;
        totalChunks.current++;
        try {
          const url = await getPresignedUrl(interviewId, idx, e.data.type);
          
          if (url.includes('mock-upload')) {
             // Skip actual fetch if it is a mock development URL
             uploadedChunks.current++;
             setUploadProgress(Math.round((uploadedChunks.current / totalChunks.current) * 100));
          } else {
             await uploadVideoChunk(e.data, url);
             uploadedChunks.current++;
             setUploadProgress(Math.round((uploadedChunks.current / totalChunks.current) * 100));
          }
          
        } catch (err) { console.error('Background upload failed for chunk', idx, err); }
      }
    };
    
    mr.start(3000); // chunk every 3s
    mediaRecorder.current = mr;
    setIsRecording(true);
  }, [stream, interviewId]);

  const stopRecording = useCallback(() => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  return { stream, isRecording, uploadProgress, startStream, stopStream, startRecording, stopRecording };
}
