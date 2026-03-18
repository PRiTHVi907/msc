import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SystemCheck } from '../SystemCheck'; // Re-creating test for hardware boundaries

describe('Hardware Error Boundaries (SystemCheck)', () => {
  beforeEach(() => {
    // Override MediaDevices
    Object.defineProperty(global.navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn(),
      },
      writable: true,
    });
  });

  it('gracefully catches NotAllowedError on denied permissions', async () => {
    // Mock navigator.mediaDevices.getUserMedia to throw NotAllowedError immediately
    (global.navigator.mediaDevices.getUserMedia as any).mockRejectedValueOnce(
      new DOMException('Permission denied', 'NotAllowedError')
    );

    render(<SystemCheck />);

    // Wait for the async hardware check to reject and render fallback UI
    const errorTitle = await screen.findByText(/Microphone\/Camera Access Required/i);
    expect(errorTitle).toBeInTheDocument();
    
    const instructionalText = screen.getByText(/Please allow camera and microphone permissions in your browser/i);
    expect(instructionalText).toBeInTheDocument();
  });
});
