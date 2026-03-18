import { useState } from 'react';
import { Plus, Trash2, Settings2, Bell, Smartphone, Mail } from 'lucide-react';

interface Question { id: string; text: string; allowFollowup: boolean; }
interface JobForm { title: string; dept: string; skills: string; type: 'async' | 'live'; minScore: number; qs: Question[]; notifs: { email: boolean; sms: boolean; wa: boolean; }; }

export function JobBuilder() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<JobForm>({ title: '', dept: '', skills: '', type: 'live', minScore: 70, qs: [{ id: '1', text: 'Tell me about yourself.', allowFollowup: true }], notifs: { email: true, sms: false, wa: false } });

  const addQ = () => setForm({ ...form, qs: [...form.qs, { id: Date.now().toString(), text: '', allowFollowup: false }] });
  const rmQ = (id: string) => setForm({ ...form, qs: form.qs.filter(q => q.id !== id) });
  const updateQ = (id: string, text: string) => setForm({ ...form, qs: form.qs.map(q => q.id === id ? { ...q, text } : q) });
  const toggleFollowup = (id: string) => setForm({ ...form, qs: form.qs.map(q => q.id === id ? { ...q, allowFollowup: !q.allowFollowup } : q) });
  const toggleNotif = (t: keyof JobForm['notifs']) => setForm({ ...form, notifs: { ...form.notifs, [t]: !form.notifs[t] } });

  const isValid = () => step !== 3 || (form.type === 'async' || form.qs.length >= 10);

  const saveConfiguration = async () => {
    try {
      const res = await fetch('/api/v1/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (res.ok) alert('Job configuration saved to database successfully!');
      else alert('Failed to save job configuration.');
    } catch (err) {
      console.error(err);
      alert('Error saving configuration.');
    }
  };

  return (
    <div className="max-w-3xl mx-auto bg-white p-8 rounded-xl border border-gray-100 shadow-sm animate-fade-in">
      <div className="mb-8 flex justify-between items-center border-b pb-4">
        <h1 className="text-2xl font-bold text-[#0A2540]">Create Interview Configuration</h1>
        <span className="text-sm font-medium text-[#8792A2]">Step {step} of 4</span>
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Role Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <label className="block"><span className="text-sm font-medium">Job Title</span><input type="text" value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} className="mt-1 w-full p-2 border rounded focus-ring" placeholder="e.g. Senior Engineer" /></label>
            <label className="block"><span className="text-sm font-medium">Department</span><input type="text" value={form.dept} onChange={(e) => setForm({...form, dept: e.target.value})} className="mt-1 w-full p-2 border rounded focus-ring" placeholder="Engineering" /></label>
          </div>
          <label className="block"><span className="text-sm font-medium">Required Skills & Objectives</span><textarea value={form.skills} onChange={(e) => setForm({...form, skills: e.target.value})} className="mt-1 w-full p-2 border rounded focus-ring h-32" placeholder="List key competencies..." /></label>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Interview Type</h2>
          <div className="flex gap-4">
            {(['async', 'live'] as const).map(t => (
              <button key={t} onClick={() => setForm({...form, type: t})} className={`flex-1 p-4 border rounded-xl focus-ring transition-transform hover:scale-[1.02] ${form.type === t ? 'border-[#1D5A85] bg-[#1D5A85]/5 ring-1 ring-[#1D5A85]' : 'border-gray-200 hover:bg-gray-50'}`}>
                <h3 className="font-semibold text-[#0A2540] capitalize">{t} Video</h3>
                <p className="text-sm text-[#8792A2] mt-1">{t === 'async' ? 'Candidate records answers alone.' : 'Real-time Retell AI conversation.'}</p>
              </button>
            ))}
          </div>
          <div className="mt-8">
            <h3 className="text-sm font-medium text-[#1A1A1A] mb-3 flex items-center"><Settings2 size={16} className="mr-2" /> Notification Triggers</h3>
            <div className="space-y-3 p-4 bg-gray-50 border rounded-lg">
               {[ { k: 'email', l: 'Email Invites & Reminders', i: Mail },
                  { k: 'sms', l: 'SMS Notifications', i: Smartphone },
                  { k: 'wa', l: 'WhatsApp Integration', i: Bell } ].map(n => (
                 <label key={n.k} className="flex items-center justify-between cursor-pointer">
                   <div className="flex items-center space-x-2 text-[#1A1A1A]"><n.i size={16} className="text-[#8792A2]" /><span className="text-sm">{n.l}</span></div>
                   <input type="checkbox" checked={form.notifs[n.k as keyof JobForm['notifs']]} onChange={() => toggleNotif(n.k as keyof JobForm['notifs'])} className="w-4 h-4 text-[#0A2540] focus-ring rounded" />
                 </label>
               ))}
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">AI Question Configuration</h2>
            <span className={`text-sm ${form.type === 'live' && form.qs.length < 10 ? 'text-red-600' : 'text-[#8792A2]'}`}>{form.qs.length} / {form.type === 'live' ? '10 min' : 'unlimited'}</span>
          </div>
          <div className="space-y-3">
            {form.qs.map((q, i) => (
              <div key={q.id} className="flex items-start gap-3 p-3 border border-gray-100 bg-gray-50 rounded-lg">
                <span className="font-medium text-[#8792A2] pt-2">{i+1}.</span>
                <div className="flex-1 space-y-2">
                   <input type="text" value={q.text} onChange={(e) => updateQ(q.id, e.target.value)} className="w-full p-2 border rounded focus-ring bg-white" placeholder="Question prompt..." />
                   <label className="flex items-center space-x-2 text-xs text-[#1A1A1A] cursor-pointer">
                     <input type="checkbox" checked={q.allowFollowup} onChange={() => toggleFollowup(q.id)} className="rounded text-[#0A2540] focus-ring" />
                     <span>Allow AI Follow-ups</span>
                   </label>
                </div>
                <button onClick={() => rmQ(q.id)} className="p-2 text-red-500 hover:bg-red-50 rounded focus-ring"><Trash2 size={18} /></button>
              </div>
            ))}
          </div>
          <button onClick={addQ} className="w-full p-3 border-2 border-dashed border-gray-300 hover:border-[#1D5A85] hover:bg-[#1D5A85]/5 text-[#1D5A85] font-medium rounded-lg flex justify-center items-center transition-colors focus-ring"><Plus size={18} className="mr-2" /> Add Question</button>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">AI Evaluation Rubric</h2>
          <div className="p-6 border rounded-xl bg-gray-50">
            <div className="flex justify-between mb-2"><span className="text-sm font-medium">Minimum Passing Score</span><span className="font-bold text-[#0A2540]">{form.minScore}%</span></div>
            <input type="range" min="0" max="100" value={form.minScore} onChange={(e) => setForm({...form, minScore: parseInt(e.target.value)})} className="w-full accent-[#0A2540]" />
            <p className="text-xs text-[#8792A2] mt-2">Candidates scoring below {form.minScore} will be automatically archived by the AI evaluator.</p>
          </div>
        </div>
      )}

      <div className="mt-8 flex justify-between border-t pt-4">
        {step > 1 ? <button onClick={() => setStep(s => s - 1)} className="px-4 py-2 border rounded text-[#1A1A1A] hover:bg-gray-50 focus-ring font-medium">Back</button> : <div></div>}
        {step < 4 ? <button onClick={() => setStep(s => s + 1)} disabled={!isValid()} className="px-6 py-2 bg-[#0A2540] text-white rounded hover:bg-[#113B5E] focus-ring font-medium disabled:opacity-50 transition-transform hover:scale-105">Next</button> : 
                    <button onClick={saveConfiguration} className="px-6 py-2 bg-[#00D26A] text-white rounded hover:bg-[#00A352] focus-ring font-medium transition-transform hover:scale-105">Save Configuration</button>}
      </div>
    </div>
  );
}
