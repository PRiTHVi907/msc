import { useState, useMemo } from 'react';
import { Calendar as CalIcon, Globe } from 'lucide-react';

export function CalendarIntegration() {
  const [tz, setTz] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [selected, setSelected] = useState<string | null>(null);

  // Mocked base UTC available slots
  const baseSlots = useMemo(() => {
    const d = new Date(); d.setUTCDate(d.getUTCDate() + 1); d.setUTCMilliseconds(0); d.setUTCSeconds(0);
    return [10, 11, 14, 15].map(h => { const cd = new Date(d); cd.setUTCHours(h); cd.setUTCMinutes(0); return cd; });
  }, []);

  const formatter = useMemo(() => new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }), [tz]);

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl border border-gray-100 shadow-sm">
      <div className="text-center mb-8">
        <div className="inline-flex bg-[#0A2540]/10 p-3 rounded-full text-[#0A2540] mb-4"><CalIcon size={32} /></div>
        <h2 className="text-2xl font-bold text-[#0A2540]">Schedule Live AI Interview</h2>
        <p className="text-[#8792A2] mt-2">Select a time that works best for you. The AI recruiter will connect with you via Retell AI.</p>
      </div>

      <div className="mb-6 flex items-center bg-gray-50 p-3 rounded-lg border">
        <Globe size={18} className="text-[#8792A2] mr-3" />
        <select value={tz} onChange={(e) => setTz(e.target.value)} className="w-full bg-transparent border-none focus:ring-0 text-[#1A1A1A] font-medium p-0 outline-none">
          {Intl.supportedValuesOf('timeZone').map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {baseSlots.map(s => {
          const str = s.toISOString();
          const isSel = selected === str;
          return (
            <button key={str} onClick={() => setSelected(str)} className={`p-4 border rounded-xl text-left transition-all focus-ring hover:scale-[1.02] ${isSel ? 'border-[#00D26A] bg-[#00D26A]/5 ring-1 ring-[#00D26A]' : 'border-gray-200 hover:border-[#1D5A85]'}`}>
              <div className="font-semibold text-[#1A1A1A]">{formatter.format(s).split(',')[0]}</div>
              <div className={`text-sm mt-1 ${isSel ? 'text-[#00A352]' : 'text-[#8792A2]'}`}>{formatter.format(s).split(',')[1]}</div>
            </button>
          );
        })}
      </div>

      <button disabled={!selected} className="mt-8 w-full py-3 bg-[#00D26A] hover:bg-[#00A352] text-white rounded-lg font-bold focus-ring disabled:opacity-50 transition-transform hover:scale-105">Confirm Booking</button>
    </div>
  );
}
