import { useRef, useCallback } from 'react';

const SAMPLE_RATE = 16000;

/**
 * Listens for binary WebSocket messages containing raw Int16 PCM audio
 * from the Gemini AI, converts them to Float32, and plays them back
 * gaplessly via a scheduled AudioContext source buffer queue.
 */
export function useAudioEgress() {
  const ctxRef = useRef<AudioContext | null>(null);
  const nextPlayTimeRef = useRef<number>(0);

  /** Call once when the WS session starts. */
  const initContext = useCallback(() => {
    if (ctxRef.current) return;
    ctxRef.current = new AudioContext({ sampleRate: SAMPLE_RATE });
    nextPlayTimeRef.current = 0;
  }, []);

  /**
   * Feed a binary WebSocket message (Blob or ArrayBuffer) into the playback queue.
   * Must be called from websocket.onmessage when e.data is binary.
   */
  const enqueue = useCallback(async (data: Blob | ArrayBuffer) => {
    const ctx = ctxRef.current;
    if (!ctx) return;

    // Normalise to ArrayBuffer
    const arrayBuffer = data instanceof Blob ? await data.arrayBuffer() : data;

    // Interpret raw bytes as Int16 PCM
    const int16 = new Int16Array(arrayBuffer);
    if (int16.length === 0) return;

    // Convert Int16 → Float32
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / (int16[i] < 0 ? 0x8000 : 0x7fff);
    }

    // Create AudioBuffer and enqueue for gapless playback
    const buffer = ctx.createBuffer(1, float32.length, SAMPLE_RATE);
    buffer.copyToChannel(float32, 0);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);

    const now = ctx.currentTime;
    const startAt = Math.max(now, nextPlayTimeRef.current);
    source.start(startAt);
    nextPlayTimeRef.current = startAt + buffer.duration;
  }, []);

  /** Tear down the AudioContext when the session ends. */
  const destroy = useCallback(() => {
    ctxRef.current?.close().catch(() => {});
    ctxRef.current = null;
    nextPlayTimeRef.current = 0;
  }, []);

  return { initContext, enqueue, destroy };
}
