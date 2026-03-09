import { useRef, useCallback } from 'react';

// Utility to convert Float32 to Int16 PCM
export function floatTo16BitPCM(input: Float32Array): Int16Array {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return output;
}

// Utility to downsample if the browser ignores the sampleRate request
function downsampleBuffer(buffer: Float32Array, sampleRate: number, outSampleRate: number): Float32Array {
  if (outSampleRate === sampleRate) {
    return buffer;
  }
  const sampleRateRatio = sampleRate / outSampleRate;
  const newLength = Math.round(buffer.length / sampleRateRatio);
  const result = new Float32Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;
  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
    let accum = 0;
    let count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      accum += buffer[i];
      count++;
    }
    result[offsetResult] = accum / count;
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }
  return result;
}

// Convert ArrayBuffer to Base64 string
function bufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export function useMicrophoneStream(ws: WebSocket | null) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const startRecording = useCallback(async () => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket is not connected');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true
        }
      });
      streamRef.current = stream;

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000
      });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      sourceRef.current = source;

      // Deprecated but widely supported implementation
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (!ws || ws.readyState !== WebSocket.OPEN) return;

        const inputData = e.inputBuffer.getChannelData(0);
        const originalSampleRate = audioContext.sampleRate;

        // Ensure audio is exactly 16kHz
        const downsampledData = downsampleBuffer(inputData, originalSampleRate, 16000);

        // Convert downsampled buffer to Int16 PCM
        const pcm16 = floatTo16BitPCM(downsampledData);

        // Encode to base64
        const base64Data = bufferToBase64(pcm16.buffer);

        // Discard empty buffers to save bandwidth
        if (base64Data.length === 0) return;

        // Standard WebSocket audio message format
        const payload = {
          type: "audio",
          data: base64Data
        };

        ws.send(JSON.stringify(payload));
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

    } catch (err) {
      console.error('Error starting raw microphone stream:', err);
    }
  }, [ws]);

  const stopRecording = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current.onaudioprocess = null;
      processorRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(console.error);
      audioContextRef.current = null;
    }
  }, []);

  return { startRecording, stopRecording };
}
