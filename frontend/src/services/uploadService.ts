export async function uploadVideoChunk(chunk: Blob, presignedUrl: string) {
  try {
    const res = await fetch(presignedUrl, {
      method: 'PUT',
      headers: { 'Content-Type': chunk.type },
      body: chunk
    });
    if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);
  } catch (error) {
    console.error('Chunk upload error:', error);
    throw error;
  }
}

// In a real app we'd request a pre-signed URL for each chunk via our API (Phase 3 backend).
export async function getPresignedUrl(interviewId: string, chunkIndex: number, type: string): Promise<string> {
  const r = await fetch(`/api/v1/interviews/${interviewId}/video-upload-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename: `chunk_${chunkIndex}.webm`, content_type: type })
  });
  if (!r.ok) throw new Error('Failed to get upload URL');
  return (await r.json()).upload_url;
}
