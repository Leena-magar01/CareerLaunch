import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { Building2, Plus, Users, Award, FileText, CheckCircle2, XCircle, Sparkles, Send } from 'lucide-react';

export const CompanyDashboard: React.FC = () => {
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'vacancies' | 'applicants' | 'evaluations' | 'ppo'>('vacancies');
  const [selectedVacancy, setSelectedVacancy] = useState<any>(null);
  const [applicants, setApplicants] = useState<any[]>([]);

  // Create Vacancy Form State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [durationMonths, setDurationMonths] = useState('6');
  const [mode, setMode] = useState('HYBRID');
  const [location, setLocation] = useState('Pune / Remote');
  const [stipend, setStipend] = useState('25000');
  const [vacanciesCount, setVacanciesCount] = useState('3');
  const [minCgpa, setMinCgpa] = useState('7.5');
  const [maxBacklogs, setMaxBacklogs] = useState('0');
  const [branches, setBranches] = useState('CSE, IT');
  const [skills, setSkills] = useState('Java, SQL, Spring Boot');

  // Evaluation Form State
  const [evalStudentId, setEvalStudentId] = useState('');
  const [evalTech, setEvalTech] = useState('9.0');
  const [evalProblem, setEvalProblem] = useState('8.5');
  const [evalComm, setEvalComm] = useState('8.0');
  const [evalProf, setEvalProf] = useState('9.0');
  const [evalTeam, setEvalTeam] = useState('9.0');
  const [evalComments, setEvalComments] = useState('');

  // PPO Form State
  const [ppoStudentId, setPpoStudentId] = useState('');
  const [ppoStatus, setPpoStatus] = useState('OFFERED');
  const [ppoRole, setPpoRole] = useState('Software Engineer I');
  const [ppoCtc, setPpoCtc] = useState('14.5');

  const [msg, setMsg] = useState('');

  const fetchCompanyData = async () => {
    try {
      const res = await api.get('/companies/me');
      if (res.data.success) {
        setCompany(res.data.data);
        if (res.data.data.internships?.length > 0) {
          const firstVac = res.data.data.internships[0];
          setSelectedVacancy(firstVac);
          fetchApplicants(firstVac.id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchApplicants = async (vacId: string) => {
    try {
      const res = await api.get(`/internships/${vacId}/applications`);
      if (res.data.success) {
        setApplicants(res.data.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchCompanyData();
  }, []);

  const handleCreateVacancy = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const allowedBranches = branches.split(',').map(b => b.trim());
      const requiredSkills = skills.split(',').map(s => s.trim());

      const res = await api.post('/internships', {
        title,
        description,
        durationMonths: parseInt(durationMonths),
        mode,
        location,
        stipend: parseFloat(stipend),
        vacancies: parseInt(vacanciesCount),
        minCgpa: parseFloat(minCgpa),
        maxBacklogs: parseInt(maxBacklogs),
        allowedBranches,
        requiredSkills,
      });

      if (res.data.success) {
        setMsg('Vacancy posted successfully!');
        setShowCreateModal(false);
        fetchCompanyData();
      }
    } catch (e: any) {
      setMsg(e.response?.data?.error?.message || 'Failed to create vacancy');
    }
  };

  const handleStatusChange = async (appId: string, status: string) => {
    try {
      const res = await api.patch(`/applications/${appId}/status`, { status });
      if (res.data.success) {
        setMsg(`Candidate status updated to ${status}!`);
        if (selectedVacancy) fetchApplicants(selectedVacancy.id);
      }
    } catch (e) {
      setMsg('Failed to update status');
    }
  };

  const handleIssueOffer = async (appId: string) => {
    try {
      const res = await api.post(`/applications/${appId}/offer`, {
        acceptanceDeadline: '2026-12-31'
      });
      if (res.data.success) {
        setMsg('Offer letter issued & candidate selected!');
        if (selectedVacancy) fetchApplicants(selectedVacancy.id);
      }
    } catch (e) {
      setMsg('Failed to issue offer');
    }
  };

  const handleSubmitEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVacancy || !evalStudentId) return;
    try {
      const res = await api.post(`/internships/${selectedVacancy.id}/evaluations`, {
        studentId: evalStudentId,
        technicalScore: parseFloat(evalTech),
        problemSolvingScore: parseFloat(evalProblem),
        communicationScore: parseFloat(evalComm),
        professionalismScore: parseFloat(evalProf),
        teamworkScore: parseFloat(evalTeam),
        comments: evalComments
      });
      if (res.data.success) {
        setMsg('Final performance evaluation recorded!');
        setEvalComments('');
      }
    } catch (e) {
      setMsg('Failed to submit evaluation');
    }
  };

  const handleUpdatePPO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVacancy || !ppoStudentId) return;
    try {
      const res = await api.patch(`/internships/${selectedVacancy.id}/ppo`, {
        studentId: ppoStudentId,
        status: ppoStatus,
        role: ppoRole,
        offeredCtc: parseFloat(ppoCtc)
      });
      if (res.data.success) {
        setMsg('PPO record updated!');
      }
    } catch (e) {
      setMsg('Failed to update PPO');
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-400">Loading recruiter workspace...</div>;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      {/* Header Banner */}
      <div className="glass-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
            <Building2 className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{company?.name || 'Recruiter Hub'}</h1>
            <p className="text-xs text-slate-400">Industry: {company?.industry} &bull; Contact: {company?.contactName}</p>
          </div>
        </div>

        <button onClick={() => setShowCreateModal(true)} className="btn-primary text-xs flex items-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>Post New Vacancy</span>
        </button>
      </div>

      {msg && (
        <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs rounded-xl flex items-center justify-between">
          <span>{msg}</span>
          <button onClick={() => setMsg('')} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-800 pb-2 text-xs">
        <button
          onClick={() => setActiveTab('vacancies')}
          className={`px-4 py-2 rounded-xl font-semibold ${activeTab === 'vacancies' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400'}`}
        >
          Vacancies ({company?.internships?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('applicants')}
          className={`px-4 py-2 rounded-xl font-semibold ${activeTab === 'applicants' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400'}`}
        >
          ✨ AI Candidate Ranker ({applicants.length})
        </button>
        <button
          onClick={() => setActiveTab('evaluations')}
          className={`px-4 py-2 rounded-xl font-semibold ${activeTab === 'evaluations' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400'}`}
        >
          Intern Evaluations
        </button>
        <button
          onClick={() => setActiveTab('ppo')}
          className={`px-4 py-2 rounded-xl font-semibold ${activeTab === 'ppo' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400'}`}
        >
          PPO Management
        </button>
      </div>

      {/* TAB 1: VACANCIES */}
      {activeTab === 'vacancies' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {company?.internships?.map((vac: any) => (
            <div
              key={vac.id}
              onClick={() => { setSelectedVacancy(vac); fetchApplicants(vac.id); setActiveTab('applicants'); }}
              className="glass-card p-6 border-slate-700/60 hover:border-indigo-500/50 cursor-pointer transition-all space-y-3"
            >
              <div className="flex items-start justify-between">
                <h3 className="font-bold text-white text-base">{vac.title}</h3>
                <StatusBadge status={vac.status} />
              </div>
              <p className="text-xs text-slate-400 line-clamp-2">{vac.description}</p>
              <div className="grid grid-cols-3 gap-2 text-xs bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                <div><span className="text-slate-500 block text-[10px]">Stipend</span> ₹{vac.stipend}/mo</div>
                <div><span className="text-slate-500 block text-[10px]">Min CGPA</span> {vac.minCgpa}</div>
                <div><span className="text-slate-500 block text-[10px]">Applicants</span> {vac.applications?.length || 0}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: AI CANDIDATE RANKER & APPLICANTS */}
      {activeTab === 'applicants' && (
        <div className="space-y-4">
          <div className="glass-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                  <Sparkles className="w-5 h-5 text-indigo-400" />
                  <span>AI Candidate Matching & Ranking</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Showing candidates for: <strong className="text-white">{selectedVacancy?.title || 'Selected Vacancy'}</strong>
                </p>
              </div>

              <select
                value={selectedVacancy?.id || ''}
                onChange={(e) => {
                  const vac = company?.internships?.find((i: any) => i.id === e.target.value);
                  if (vac) { setSelectedVacancy(vac); fetchApplicants(vac.id); }
                }}
                className="bg-slate-900 border border-slate-700 text-white text-xs rounded-xl p-2.5"
              >
                {company?.internships?.map((i: any) => (
                  <option key={i.id} value={i.id}>{i.title}</option>
                ))}
              </select>
            </div>

            {applicants.length === 0 ? (
              <p className="text-xs text-slate-400">No applications received for this vacancy yet.</p>
            ) : (
              <div className="space-y-4">
                {applicants.map((app: any) => (
                  <div key={app.id} className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl space-y-3 text-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-white text-base">{app.student?.fullName}</h4>
                        <p className="text-slate-400 text-xs">
                          {app.student?.department} &bull; CGPA: <strong className="text-white">{app.student?.cgpa}</strong> &bull; Backlogs: {app.student?.backlogs}
                        </p>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-xl border border-indigo-500/30">
                          {app.aiMatchScore}% AI Match
                        </span>
                        <StatusBadge status={app.status} />
                      </div>
                    </div>

                    {app.matchExplanation && (
                      <p className="text-xs text-slate-300 bg-slate-800/60 p-3 rounded-xl border border-slate-700">
                        ✨ <strong>AI Breakdown:</strong> {app.matchExplanation}
                      </p>
                    )}

                    {/* Candidate Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800">
                      <button onClick={() => handleStatusChange(app.id, 'SHORTLISTED')} className="btn-secondary text-[11px] py-1.5 px-3">
                        Shortlist
                      </button>
                      <button onClick={() => handleIssueOffer(app.id)} className="btn-primary text-[11px] py-1.5 px-3">
                        Issue Offer Letter
                      </button>
                      <button onClick={() => handleStatusChange(app.id, 'REJECTED')} className="btn-secondary text-[11px] py-1.5 px-3 hover:text-rose-400">
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: INTERN EVALUATION RUBRIC */}
      {activeTab === 'evaluations' && (
        <div className="glass-card p-6 space-y-4 max-w-xl">
          <h3 className="text-lg font-bold text-white">Company Final Evaluation Rubric</h3>
          <form onSubmit={handleSubmitEvaluation} className="space-y-3 text-xs">
            <div>
              <label className="text-slate-300 block mb-1">Select Candidate / Student</label>
              <select
                value={evalStudentId}
                onChange={(e) => setEvalStudentId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-2.5"
              >
                <option value="">-- Select Student --</option>
                {applicants.map((a: any) => (
                  <option key={a.student?.id} value={a.student?.id}>{a.student?.fullName}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-300 block mb-1">Technical Score (1-10)</label>
                <input type="number" step="0.1" value={evalTech} onChange={(e) => setEvalTech(e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-2.5" />
              </div>
              <div>
                <label className="text-slate-300 block mb-1">Problem Solving (1-10)</label>
                <input type="number" step="0.1" value={evalProblem} onChange={(e) => setEvalProblem(e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-2.5" />
              </div>
              <div>
                <label className="text-slate-300 block mb-1">Communication (1-10)</label>
                <input type="number" step="0.1" value={evalComm} onChange={(e) => setEvalComm(e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-2.5" />
              </div>
              <div>
                <label className="text-slate-300 block mb-1">Professionalism (1-10)</label>
                <input type="number" step="0.1" value={evalProf} onChange={(e) => setEvalProf(e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-2.5" />
              </div>
            </div>

            <div>
              <label className="text-slate-300 block mb-1">Supervisor Comments</label>
              <textarea rows={3} value={evalComments} onChange={(e) => setEvalComments(e.target.value)} placeholder="Performance notes..." className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-2.5" />
            </div>

            <button type="submit" className="w-full btn-primary text-xs py-2.5">
              Submit Evaluation
            </button>
          </form>
        </div>
      )}

      {/* TAB 4: PPO MANAGEMENT */}
      {activeTab === 'ppo' && (
        <div className="glass-card p-6 space-y-4 max-w-xl">
          <h3 className="text-lg font-bold text-white">Record Pre-Placement Offer (PPO)</h3>
          <form onSubmit={handleUpdatePPO} className="space-y-3 text-xs">
            <div>
              <label className="text-slate-300 block mb-1">Select Candidate</label>
              <select
                value={ppoStudentId}
                onChange={(e) => setPpoStudentId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-2.5"
              >
                <option value="">-- Select Student --</option>
                {applicants.map((a: any) => (
                  <option key={a.student?.id} value={a.student?.id}>{a.student?.fullName}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-slate-300 block mb-1">PPO Decision Status</label>
              <select value={ppoStatus} onChange={(e) => setPpoStatus(e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-2.5">
                <option value="OFFERED">OFFERED</option>
                <option value="UNDER_CONSIDERATION">UNDER CONSIDERATION</option>
                <option value="DECLINED">DECLINED</option>
              </select>
            </div>

            <div>
              <label className="text-slate-300 block mb-1">Full-Time Role Title</label>
              <input type="text" value={ppoRole} onChange={(e) => setPpoRole(e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-2.5" />
            </div>

            <div>
              <label className="text-slate-300 block mb-1">Offered CTC (LPA)</label>
              <input type="number" step="0.1" value={ppoCtc} onChange={(e) => setPpoCtc(e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-2.5" />
            </div>

            <button type="submit" className="w-full btn-primary text-xs py-2.5">
              Save PPO Record
            </button>
          </form>
        </div>
      )}

      {/* Create Vacancy Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="glass-card p-6 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-white">Create New Internship Vacancy</h3>
            <form onSubmit={handleCreateVacancy} className="space-y-3 text-xs">
              <input type="text" required placeholder="Role Title" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-2.5" />
              <textarea rows={3} placeholder="Role description..." value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-2.5" />

              <div className="grid grid-cols-2 gap-3">
                <input type="number" placeholder="Duration (months)" value={durationMonths} onChange={(e) => setDurationMonths(e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-2.5" />
                <input type="number" placeholder="Stipend (₹/mo)" value={stipend} onChange={(e) => setStipend(e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-2.5" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <input type="number" step="0.1" placeholder="Min CGPA" value={minCgpa} onChange={(e) => setMinCgpa(e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-2.5" />
                <input type="number" placeholder="Max Backlogs" value={maxBacklogs} onChange={(e) => setMaxBacklogs(e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-2.5" />
              </div>

              <input type="text" placeholder="Allowed Branches (e.g. CSE, IT)" value={branches} onChange={(e) => setBranches(e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-2.5" />
              <input type="text" placeholder="Required Skills (e.g. Java, SQL, React)" value={skills} onChange={(e) => setSkills(e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-2.5" />

              <div className="flex space-x-2 pt-2">
                <button type="submit" className="flex-1 btn-primary py-2.5">Publish Vacancy</button>
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary py-2.5">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
