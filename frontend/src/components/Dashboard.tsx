import { useState, useMemo, useEffect } from 'react';
import { UserCheck, Clock, CheckCircle, BarChart3 } from 'lucide-react';

interface Candidate { id: string; name: string; role: string; status: 'Invited' | 'Recorded' | 'Scored'; score: number | null; }

export function Dashboard() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  
  useEffect(() => {
    fetch('/api/v1/interviews')
      .then(res => res.json())
      .then(data => setCandidates(data))
      .catch(err => console.error("Failed to load interviews", err));
  }, []);
  
  const metrics = useMemo(() => ({
    activeRoles: 4,
    pendingReview: candidates.filter(c => c.status === 'Recorded').length,
    completed: candidates.filter(c => c.status === 'Scored').length,
    avgScore: Math.round(candidates.reduce((acc, c) => acc + (c.score || 0), 0) / (candidates.filter(c => c.score).length || 1))
  }), [candidates]);

  const scoreColor = (score: number | null) => {
    if (score === null) return 'bg-gray-100 text-gray-600';
    if (score >= 80) return 'bg-green-100 text-green-700';
    if (score >= 50) return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  };

  const statusBadge = (s: Candidate['status']) => {
    if (s === 'Scored') return 'bg-green-100 text-green-800';
    if (s === 'Recorded') return 'bg-yellow-100 text-yellow-800';
    return 'bg-blue-100 text-blue-800';
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[ { label: 'Active Roles', val: metrics.activeRoles, icon: BriefcaseIcon },
           { label: 'Pending Review', val: metrics.pendingReview, icon: Clock },
           { label: 'Completed', val: metrics.completed, icon: CheckCircle },
           { label: 'Avg AI Score', val: metrics.avgScore, icon: BarChart3 }
        ].map((m, i) => (
          <StatCard key={i} label={m.label} value={m.val} icon={m.icon} />
        ))}
      </div>

      <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b bg-gray-50"><h2 className="font-semibold text-[#0A2540]">Recent Candidates</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-[#8792A2]">
              <tr><th className="p-4">Name</th><th className="p-4">Applied Role</th><th className="p-4">Status</th><th className="p-4">AI Score</th><th className="p-4">Actions</th></tr>
            </thead>
            <tbody className="divide-y">
              {candidates.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors duration-200">
                  <td className="p-4 font-medium text-[#1A1A1A]">{c.name}</td>
                  <td className="p-4 text-[#8792A2]">{c.role}</td>
                  <td className="p-4"><span className={`px-2 py-1 rounded-full text-xs font-medium ${statusBadge(c.status)}`}>{c.status === 'Scored' ? 'Completed' : c.status === 'Recorded' ? 'Pending' : 'Invited'}</span></td>
                  <td className="p-4"><span className={`px-2 py-1 rounded-full text-xs font-medium ${scoreColor(c.score)}`}>{c.score || 'N/A'}</span></td>
                  <td className="p-4 flex space-x-2">
                    <button className="p-1 px-3 text-sm text-white bg-[#00D26A] hover:bg-[#00A352] focus-ring rounded transition-transform hover:scale-105">Review</button>
                    <button className="p-1 px-3 text-sm text-red-600 hover:bg-red-50 focus-ring rounded transition-transform hover:scale-105">Reject</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function BriefcaseIcon(props: any) { return <UserCheck {...props} />; }

function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon: any }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:-translate-y-1 hover:shadow-md transition-all duration-300 group flex items-center justify-between">
      <div>
        <p className="text-sm text-[#8792A2] font-medium">{label}</p>
        <p className="text-2xl font-bold text-[#0A2540]">{value}</p>
      </div>
      <div className="h-11 w-11 rounded-xl bg-gray-50 text-slate-500 flex items-center justify-center group-hover:bg-blue-50 group-hover:text-brand-primary transition-colors">
        <Icon size={22} />
      </div>
    </div>
  );
}
