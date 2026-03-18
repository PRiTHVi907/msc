import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Dashboard from '../Dashboard'; // Adjust path as necessary
import { useAppStore } from '../../store/useAppStore';

// Mock Zustand
vi.mock('../../store/useAppStore', () => ({
  useAppStore: vi.fn(),
}));

describe('Dashboard Component State Rendering', () => {
  it('renders correctly for Admin role', () => {
    (useAppStore as any).mockReturnValue({
      userRole: 'admin',
      isAuthenticated: true,
      currentUser: { name: 'Admin User' }
    });

    render(<Dashboard />);
    // Assert Admin specific view
    expect(screen.getByText(/Admin Dashboard/i)).toBeInTheDocument();
    expect(screen.queryByText(/Candidate View/i)).not.toBeInTheDocument();
  });

  it('renders correctly for Candidate role', () => {
    (useAppStore as any).mockReturnValue({
      userRole: 'candidate',
      isAuthenticated: true,
      currentUser: { name: 'Candidate User' }
    });

    render(<Dashboard />);
    // Assert Candidate specific view
    expect(screen.getByText(/Welcome, Candidate User/i)).toBeInTheDocument();
    expect(screen.queryByText(/Admin Dashboard/i)).not.toBeInTheDocument();
  });
});
