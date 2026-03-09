import { useRef, useCallback } from 'react';

// ─── PCM conversion utilities ───────────────────────────────────────────────

function floatTo16BitPCM(input: Float32Array): Int16Array {
  const out = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

function downsample(buf: Float32Array, fromHz: number, toHz: number): Float32Array {
  if (fromHz === toHz) return buf;
  const ratio = fromHz / toHz;
  const len = Math.round(buf.length / ratio);
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const start = Math.round(i * ratio);
    const end = Math.round((i + 1) * ratio);
    let sum = 0;
    let cnt = 0;
    for (let j = start; j < end && j < buf.length; j++) { sum += buf[j]; cnt++; }
    out[i] = cnt > 0 ? sum / cnt : 0;
  }
  return out;
}

function int16ToBase64(pcm: Int16Array): string {
  const bytes = new Uint8Array(pcm.buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return window.btoa(binary);
}

// ─── Hook ────────────────────────────────────────────────────────────────────

const TARGET_SAMPLE_RATE = 16000;
const BUFFER_SIZE = 4096;

/**
 * Captures microphone audio, downsamples to 16 kHz PCM-16,
 * and sends chunks to the WebSocket as:
 *   { "type": "audio", "data": "<base64 Int16 PCM>" }
 */
export function useAudioIngress(ws: WebSocket | null) {
  const ctxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const start = useCallback(async () => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
    });
    streamRef.current = stream;

    const ctx = new AudioContext({ sampleRate: TARGET_SAMPLE_RATE });
    ctxRef.current = ctx;

    const source = ctx.createMediaStreamSource(stream);
    sourceRef.current = source;

    const processor = ctx.createScriptProcessor(BUFFER_SIZE, 1, 1);
    processorRef.current = processor;

    processor.onaudioprocess = (e) => {
      if (!ws || ws.readyState !== WebSocket.OPEN) return;

      const raw = e.inputBuffer.getChannelData(0);
      const downsampled = downsample(raw, ctx.sampleRate, TARGET_SAMPLE_RATE);
      const pcm16 = floatTo16BitPCM(downsampled);
      const b64 = int16ToBase64(pcm16);
      if (!b64) return;

      ws.send(JSON.stringify({ type: 'audio', data: b64 }));
    };

    source.connect(processor);
    processor.connect(ctx.destination);
  }, [ws]);

  const stop = useCallback(() => {
    processorRef.current?.disconnect();
    if (processorRef.current) processorRef.current.onaudioprocess = null;
    processorRef.current = null;

    sourceRef.current?.disconnect();
    sourceRef.current = null;

    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    ctxRef.current?.close().catch(() => {});
    ctxRef.current = null;
  }, []);

  return { start, stop, streamRef };
}
