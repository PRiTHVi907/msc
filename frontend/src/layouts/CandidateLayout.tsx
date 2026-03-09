import { Outlet } from 'react-router-dom';
import { HelpCircle } from 'lucide-react';

export default function CandidateLayout() {
  return (
    <div className="min-h-screen bg-[#F4F5F7] flex flex-col items-center">
      <header className="w-full max-w-5xl h-16 flex items-center justify-between px-6 mt-4 bg-white shadow-sm rounded-t-xl">
        <span className="font-bold text-[#0A2540] text-xl">InterviewAI</span>
        <div className="flex items-center space-x-6">
          <span className="text-sm font-medium text-[#8792A2]">Step 1 of 4: Setup</span>
          <button className="flex items-center space-x-1 text-[#0A2540] hover:text-[#1D5A85] focus-ring p-1 rounded"><HelpCircle size={18} /><span className="text-sm">Help</span></button>
        </div>
      </header>
      <main className="w-full max-w-5xl flex-1 bg-white shadow-sm rounded-b-xl p-8 mb-8">
        <Outlet />
      </main>
    </div>
  );
}
