import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { ShieldCheck, UserCheck, BarChart3, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export const TNPAdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'verifications' | 'mentors' | 'analytics' | 'ppo'>('verifications');
  const [verifications, setVerifications] = useState<any[]>([]);
  const [mentors, setMentors] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [ppos, setPpos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Mentor Assign State
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedInternshipId, setSelectedInternshipId] = useState('');
  const [selectedMentorId, setSelectedMentorId] = useState('');

  const [msg, setMsg] = useState('');

  const fetchTNPData = async () => {
    try {
      const vRes = await api.get('/tnp/verification-queue');
      if (vRes.data.success) setVerifications(vRes.data.data);

      const mRes = await api.get('/tnp/list');
      if (mRes.data.success) setMentors(mRes.data.data);

      const aRes = await api.get('/analytics/overview');
      if (aRes.data.success) setAnalytics(aRes.data.data);

      const pRes = await api.get('/tnp/ppo');
      if (pRes.data.success) setPpos(pRes.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTNPData();
  }, []);

  const handleApproveVerification = async (vId: string) => {
    try {
      const res = await api.post(`/tnp/verifications/${vId}/approve`, { reason: 'Verified by T&P cell' });
      if (res.data.success) {
        setMsg('Verification approved successfully!');
        fetchTNPData();
      }
    } catch (e) {
      setMsg('Failed to approve verification');
    }
  };

  const handleAssignMentor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !selectedInternshipId || !selectedMentorId) return;
    try {
      const res = await api.post('/tnp/mentor-assignments', {
        studentId: selectedStudentId,
        internshipId: selectedInternshipId,
        mentorId: selectedMentorId
      });
      if (res.data.success) {
        setMsg('Faculty mentor assigned successfully!');
        fetchTNPData();
      }
    } catch (e: any) {
      setMsg(e.response?.data?.error?.message || 'Failed to assign mentor');
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-400">Loading T&P governance portal...</div>;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      {/* Top Banner */}
      <div className="glass-card p-6 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Training & Placement (T&P) Governance</h1>
            <p className="text-xs text-slate-400">Institutional Oversight, Verification Queues & Analytics</p>
          </div>
        </div>
      </div>

      {msg && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs rounded-xl flex items-center justify-between">
          <span>{msg}</span>
          <button onClick={() => setMsg('')} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
        <div className="glass-card p-4">
          <span className="text-slate-400 block">Pending Verifications</span>
          <span className="text-2xl font-black text-amber-400 mt-1 block">
            {verifications.filter(v => v.status === 'PENDING').length}
          </span>
        </div>
        <div className="glass-card p-4">
          <span className="text-slate-400 block">Active Internships</span>
          <span className="text-2xl font-black text-cyan-400 mt-1 block">
            {analytics?.metrics?.activeInternships || 0}
          </span>
        </div>
        <div className="glass-card p-4">
          <span className="text-slate-400 block">Completed Internships</span>
          <span className="text-2xl font-black text-emerald-400 mt-1 block">
            {analytics?.metrics?.completedInternships || 0}
          </span>
        </div>
        <div className="glass-card p-4">
          <span className="text-slate-400 block">PPO Offers</span>
          <span className="text-2xl font-black text-indigo-400 mt-1 block">
            {analytics?.metrics?.ppoOfferedCount || 0}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-800 pb-2 text-xs">
        <button
          onClick={() => setActiveTab('verifications')}
          className={`px-4 py-2 rounded-xl font-semibold ${activeTab === 'verifications' ? 'bg-amber-600 text-white' : 'bg-slate-900 text-slate-400'}`}
        >
          Verification Queues ({verifications.filter(v => v.status === 'PENDING').length})
        </button>
        <button
          onClick={() => setActiveTab('mentors')}
          className={`px-4 py-2 rounded-xl font-semibold ${activeTab === 'mentors' ? 'bg-amber-600 text-white' : 'bg-slate-900 text-slate-400'}`}
        >
          Faculty Mentor Assignment
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2 rounded-xl font-semibold ${activeTab === 'analytics' ? 'bg-amber-600 text-white' : 'bg-slate-900 text-slate-400'}`}
        >
          Institutional Analytics
        </button>
        <button
          onClick={() => setActiveTab('ppo')}
          className={`px-4 py-2 rounded-xl font-semibold ${activeTab === 'ppo' ? 'bg-amber-600 text-white' : 'bg-slate-900 text-slate-400'}`}
        >
          PPO Registry ({ppos.length})
        </button>
      </div>

      {/* TAB 1: VERIFICATION QUEUE */}
      {activeTab === 'verifications' && (
        <div className="glass-card p-6 space-y-4">
          <h3 className="text-lg font-bold text-white">Pending Verification Queue</h3>
          {verifications.length === 0 ? (
            <p className="text-xs text-slate-400">No pending verifications in queue.</p>
          ) : (
            <div className="space-y-3">
              {verifications.map((v) => (
                <div key={v.id} className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-amber-400 uppercase tracking-wider">{v.entityType} Verification</span>
                      <StatusBadge status={v.status} size="sm" />
                    </div>
                    <p className="text-slate-300 mt-1">{v.reason}</p>
                    <span className="text-[11px] text-slate-500">Submitted: {new Date(v.createdAt).toLocaleDateString()}</span>
                  </div>

                  {v.status === 'PENDING' && (
                    <button
                      onClick={() => handleApproveVerification(v.id)}
                      className="btn-primary text-xs py-1.5 px-4"
                    >
                      Approve & Verify
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: FACULTY MENTOR ASSIGNMENT */}
      {activeTab === 'mentors' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-card p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Assign Faculty Mentor to Intern</h3>
            <form onSubmit={handleAssignMentor} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 block mb-1">Select Faculty Mentor</label>
                <select
                  value={selectedMentorId}
                  onChange={(e) => setSelectedMentorId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-2.5"
                >
                  <option value="">-- Choose Mentor --</option>
                  {mentors.map(m => (
                    <option key={m.id} value={m.id}>{m.fullName} ({m.department}) - Active: {m._count?.assignments || 0}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Student ID (UUID)</label>
                <input
                  type="text"
                  placeholder="Enter Student Profile ID..."
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-2.5"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Internship ID (UUID)</label>
                <input
                  type="text"
                  placeholder="Enter Internship ID..."
                  value={selectedInternshipId}
                  onChange={(e) => setSelectedInternshipId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-2.5"
                />
              </div>

              <button type="submit" className="w-full btn-primary text-xs py-2.5">
                Assign Faculty Mentor
              </button>
            </form>
          </div>

          <div className="glass-card p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Faculty Mentor Roster</h3>
            <div className="space-y-3">
              {mentors.map((m) => (
                <div key={m.id} className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs flex justify-between items-center">
                  <div>
                    <h5 className="font-bold text-white">{m.fullName}</h5>
                    <p className="text-slate-400">{m.department} &bull; {m.designation}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    Capacity: {m._count?.assignments || 0} / {m.maxCapacity}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: INSTITUTIONAL ANALYTICS */}
      {activeTab === 'analytics' && analytics && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Funnel Graph */}
            <div className="glass-card p-6 space-y-4">
              <h3 className="text-base font-bold text-white">Internship Conversion Funnel</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.funnel} layout="vertical">
                    <XAxis type="number" stroke="#64748b" fontSize={11} />
                    <YAxis dataKey="stage" type="category" stroke="#94a3b8" fontSize={11} width={100} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }} />
                    <Bar dataKey="count" fill="#0284c7" radius={[0, 8, 8, 0]}>
                      {analytics.funnel?.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={['#0284c7', '#38bdf8', '#818cf8', '#a855f7', '#ec4899', '#10b981', '#f59e0b'][index % 7]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Department Graph */}
            <div className="glass-card p-6 space-y-4">
              <h3 className="text-base font-bold text-white">Students per Engineering Department</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.departmentDistribution}>
                    <XAxis dataKey="department" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }} />
                    <Bar dataKey="students" fill="#10b981" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PPO REGISTRY */}
      {activeTab === 'ppo' && (
        <div className="glass-card p-6 space-y-4">
          <h3 className="text-lg font-bold text-white">Pre-Placement Offer (PPO) Conversion Registry</h3>
          {ppos.length === 0 ? (
            <p className="text-xs text-slate-400">No PPOs recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {ppos.map((p) => (
                <div key={p.id} className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <h4 className="font-bold text-white">{p.student?.fullName} ({p.student?.department})</h4>
                    <p className="text-slate-400">{p.company?.name} &bull; Role: {p.role}</p>
                    <span className="text-emerald-400 font-semibold block mt-1">Offered CTC: ₹{p.offeredCtc} LPA</span>
                  </div>
                  <StatusBadge status={p.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
