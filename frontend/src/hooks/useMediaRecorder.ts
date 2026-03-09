import { useRef, useCallback } from 'react';

const MIME = 'video/webm;codecs=vp9,opus';

/**
 * Records the local MediaStream as a single WebM blob using MediaRecorder.
 * On stop, PUTs the complete blob to a presigned S3 URL.
 */
export function useMediaRecorder(interviewId: string, jwtToken: string) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback((stream: MediaStream) => {
    chunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported(MIME) ? MIME : 'video/webm';
    const mr = new MediaRecorder(stream, { mimeType });

    mr.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    mr.start(250); // collect chunks every 250ms for smooth data flow
    recorderRef.current = mr;
  }, []);

  const stopRecording = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      const mr = recorderRef.current;
      if (!mr || mr.state === 'inactive') { resolve(); return; }

      mr.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType });
        chunksRef.current = [];

        try {
          // 1. Get presigned PUT URL from backend
          const urlRes = await fetch(`/api/v1/interviews/${interviewId}/video-upload-url`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${jwtToken}`,
            },
            body: JSON.stringify({ filename: 'recording.webm', content_type: mr.mimeType }),
          });

          if (!urlRes.ok) throw new Error('Failed to get presigned URL');
          const { upload_url, resource_url } = await urlRes.json();

          // 2. PUT blob to S3 (skip if mock URL)
          if (!upload_url.includes('mock-upload')) {
            const putRes = await fetch(upload_url, {
              method: 'PUT',
              headers: { 'Content-Type': mr.mimeType },
              body: blob,
            });
            if (!putRes.ok) throw new Error(`S3 PUT failed: ${putRes.statusText}`);
          }

          // 3. Notify backend to finalize the interview record
          await fetch(`/api/v1/interviews/${interviewId}/finalize-video`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${jwtToken}`,
            },
            body: JSON.stringify({ s3_resource_url: resource_url || upload_url }),
          });
        } catch (err) {
          console.error('[MediaRecorder] Upload/finalize failed:', err);
        } finally {
          resolve();
        }
      };

      mr.stop();
      recorderRef.current = null;
    });
  }, [interviewId, jwtToken]);

  return { startRecording, stopRecording };
}
