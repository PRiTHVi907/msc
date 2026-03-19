import { Outlet, Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { Menu, User, Settings, Briefcase, Users } from 'lucide-react';

export default function AdminLayout() {
  const { isSidebarOpen, toggleSidebar } = useAppStore();
  return (
    <div className="flex h-screen w-full bg-surface text-slate-900">
      <aside
        className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-brand-dark text-white shadow-xl transition-all duration-300 flex flex-col`}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/10">
          {isSidebarOpen && <span className="font-bold text-xl">InterviewAI</span>}
          <button
            onClick={toggleSidebar}
            className="p-2 rounded focus-ring hover:bg-white/10 transition-colors"
            aria-expanded={isSidebarOpen}
            aria-label="Toggle Sidebar"
          >
            <Menu size={20} />
          </button>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <Link
            to="/admin"
            className="flex items-center space-x-3 p-3 rounded-lg focus-ring transition-transform transition-colors hover:bg-white/10 hover:translate-x-1"
          >
            <Briefcase size={20} />
            {isSidebarOpen && <span>Dashboard</span>}
          </Link>
          <Link
            to="/admin/candidates"
            className="flex items-center space-x-3 p-3 rounded-lg focus-ring transition-transform transition-colors hover:bg-white/10 hover:translate-x-1"
          >
            <Users size={20} />
            {isSidebarOpen && <span>Candidates</span>}
          </Link>
          <Link
            to="/admin/settings"
            className="flex items-center space-x-3 p-3 rounded-lg focus-ring transition-transform transition-colors hover:bg-white/10 hover:translate-x-1"
          >
            <Settings size={20} />
            {isSidebarOpen && <span>Settings</span>}
          </Link>
        </nav>
      </aside>
      <main className="flex-1 flex flex-col bg-surface min-h-screen">
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-8 shadow-sm">
          <div className="text-sm text-slate-500">Admin / Dashboard</div>
          <button className="flex items-center space-x-2 p-2 rounded focus-ring hover:bg-slate-100 transition-colors">
            <User size={20} />
            <span>Admin Profile</span>
          </button>
        </header>
        <div className="flex-1 overflow-auto p-6">
          <div className="h-full w-full bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-slate-100 p-6 animate-fade-in-up">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
