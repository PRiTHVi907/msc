import { Outlet } from 'react-router-dom';
import { HelpCircle } from 'lucide-react';

export default function CandidateLayout() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#0A2540_0%,_#020617_45%,_#000000_100%)] text-white flex flex-col">
      <header className="w-full sticky top-0 z-20 border-b border-white/20 bg-transparent backdrop-blur-md">
        <div className="max-w-5xl mx-auto h-16 flex items-center justify-between px-6">
          <span className="font-bold text-xl">InterviewAI</span>
          <div className="flex items-center space-x-6">
            <span className="text-sm font-medium text-slate-200">Step 1 of 4: Setup</span>
            <button className="flex items-center space-x-1 text-slate-100 hover:text-white focus-ring p-1 rounded">
              <HelpCircle size={18} />
              <span className="text-sm">Help</span>
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 flex items-stretch justify-center px-4 sm:px-6 lg:px-8 py-6">
        <div className="w-full max-w-5xl bg-white/10 backdrop-blur-xl border border-white/15 rounded-2xl shadow-[0_18px_45px_rgba(15,23,42,0.55)] p-6 sm:p-8 animate-fade-in-up">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
