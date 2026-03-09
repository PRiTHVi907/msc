import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthSlice {
  token: string | null
  currentUser: { user_id: string; email: string } | null
  login: (token: string, user: { user_id: string; email: string }) => void
  logout: () => void
  isAuthenticated: () => boolean
}

interface InterviewSession {
  videoToken: string | null
  roomName: string | null
  interviewId: string | null
  sampleRate: number
}

interface AppStore extends AuthSlice {
  interviews: any[]
  jobs: any[]
  selectedInterview: any | null
  interviewSession: InterviewSession
  setInterviews: (interviews: any[]) => void
  setJobs: (jobs: any[]) => void
  setSelectedInterview: (interview: any) => void
  setInterviewSession: (session: Partial<InterviewSession>) => void
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // Auth
      token: null,
      currentUser: null,
      login: (token, user) => set({ token, currentUser: user }),
      logout: () => set({ token: null, currentUser: null, interviews: [], selectedInterview: null, interviewSession: { videoToken: null, roomName: null, interviewId: null, sampleRate: 16000 } }),
      isAuthenticated: () => !!get().token,

      // Interviews
      interviews: [],
      setInterviews: (interviews) => set({ interviews }),

      // Jobs
      jobs: [],
      setJobs: (jobs) => set({ jobs }),

      // Selected Interview
      selectedInterview: null,
      setSelectedInterview: (interview) => set({ selectedInterview: interview }),

      // Interview Session
      interviewSession: {
        videoToken: null,
        roomName: null,
        interviewId: null,
        sampleRate: 16000
      },
      setInterviewSession: (session) => set(state => ({
        interviewSession: { ...state.interviewSession, ...session }
      })),
    }),
    {
      name: 'app-store',
      partialize: (state) => ({
        token: state.token,
        currentUser: state.currentUser,
      }),
    }
  )
)
