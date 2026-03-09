import { create } from 'zustand';

type Role = 'candidate' | 'admin' | 'reviewer' | null;
type ToastType = 'success' | 'error' | 'info';
interface Toast { message: string; type: ToastType; id: number; }

interface AppState {
  userRole: Role;
  isAuthenticated: boolean;
  jwtToken: string | null;
  theme: 'light' | 'dark';
  isSidebarOpen: boolean;
  toasts: Toast[];
  setAuth: (role: Role, token: string) => void;
  logout: () => void;
  toggleTheme: () => void;
  toggleSidebar: () => void;
  addToast: (message: string, type: ToastType) => void;
  removeToast: (id: number) => void;
}

export const useAppStore = create<AppState>((set) => ({
  userRole: null,
  isAuthenticated: false,
  jwtToken: null,
  theme: 'light',
  isSidebarOpen: true,
  toasts: [],
  setAuth: (r, t) => set({ userRole: r, isAuthenticated: true, jwtToken: t }),
  logout: () => set({ userRole: null, isAuthenticated: false, jwtToken: null }),
  toggleTheme: () => set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),
  toggleSidebar: () => set((s) => ({ isSidebarOpen: !s.isSidebarOpen })),
  addToast: (m, t) => set((s) => ({ toasts: [...s.toasts, { message: m, type: t, id: Date.now() }] })),
  removeToast: (i) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== i) }))
}));
