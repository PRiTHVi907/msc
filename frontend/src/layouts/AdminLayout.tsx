import { Outlet, Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { Menu, User, Settings, Briefcase, Users } from 'lucide-react';

export default function AdminLayout() {
  const { isSidebarOpen, toggleSidebar } = useAppStore();
  return (
    <div className="flex h-screen w-full bg-[#F4F5F7] text-[#1A1A1A]">
      <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} transition-all bg-[#0A2540] text-white flex flex-col`}>
        <div className="h-16 flex items-center justify-between px-4 border-b border-[#113B5E]">
          {isSidebarOpen && <span className="font-bold text-xl">InterviewAI</span>}
          <button onClick={toggleSidebar} className="p-2 hover:bg-[#113B5E] rounded focus-ring" aria-expanded={isSidebarOpen} aria-label="Toggle Sidebar"><Menu size={20} /></button>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <Link to="/admin" className="flex items-center space-x-3 p-3 rounded hover:bg-[#113B5E] focus-ring"><Briefcase size={20} />{isSidebarOpen && <span>Dashboard</span>}</Link>
          <Link to="/admin/candidates" className="flex items-center space-x-3 p-3 rounded hover:bg-[#113B5E] focus-ring"><Users size={20} />{isSidebarOpen && <span>Candidates</span>}</Link>
          <Link to="/admin/settings" className="flex items-center space-x-3 p-3 rounded hover:bg-[#113B5E] focus-ring"><Settings size={20} />{isSidebarOpen && <span>Settings</span>}</Link>
        </nav>
      </aside>
      <main className="flex-1 flex flex-col">
        <header className="h-16 bg-white border-b flex items-center justify-between px-8 shadow-sm">
          <div className="text-sm text-[#8792A2]">Admin / Dashboard</div>
          <button className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded focus-ring"><User size={20} /><span>Admin Profile</span></button>
        </header>
        <div className="p-8 flex-1 overflow-auto bg-white m-4 rounded-lg shadow-sm"><Outlet /></div>
      </main>
    </div>
  );
}
