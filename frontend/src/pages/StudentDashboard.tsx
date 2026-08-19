import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { EligibilityCard } from '../components/EligibilityCard';
import {
  GraduationCap, Search, CheckCircle2, ShieldCheck, Sparkles,
  FileText, Clock, Award, Briefcase, Plus, Send, AlertTriangle, ChevronRight
} from 'lucide-react';

export const StudentDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'profile' | 'marketplace' | 'applications' | 'progress' | 'skillgap' | 'resume'>('marketplace');
  const [profile, setProfile] = useState<any>(null);
  const [vacancies, setVacancies] = useState<any[]>([]);
  const [eligibilityData, setEligibilityData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Profile Edit State
  const [cgpa, setCgpa] = useState('8.5');
  const [backlogs, setBacklogs] = useState('0');
  const [department, setDepartment] = useState('CSE');
  const [skillsInput, setSkillsInput] = useState('Java, SQL, React');
  const [projectTitle, setProjectTitle] = useState('');
  const [projectTech, setProjectTech] = useState('');
  const [projectDesc, setProjectDesc] = useState('');

  // Progress Report State
  const [weekNum, setWeekNum] = useState('1');
  const [reportTasks, setReportTasks] = useState('');
  const [reportLearning, setReportLearning] = useState('');
  const [reportChallenges, setReportChallenges] = useState('');
  const [selectedInternshipForProgress, setSelectedInternshipForProgress] = useState('');

  // AI State
  const [selectedVacancyForGap, setSelectedVacancyForGap] = useState('');
  const [skillGapResult, setSkillGapResult] = useState<any>(null);
  const [resumeText, setResumeText] = useState('');
  const [resumeResult, setResumeResult] = useState<any>(null);
  const [msg, setMsg] = useState('');

  const fetchStudentData = async () => {
    try {
      const pRes = await api.get('/students/me');
      if (pRes.data.success && pRes.data.data) {
        const p = pRes.data.data;
        setProfile(p);
        setCgpa(String(p.cgpa || 8.0));
        setBacklogs(String(p.backlogs || 0));
        setDepartment(p.department || 'CSE');
        if (p.skills) setSkillsInput(p.skills.map((s: any) => s.skillName).join(', '));
      }

      const vRes = await api.get('/internships');
      if (vRes.data.success) {
        setVacancies(vRes.data.data);
      }

      const eRes = await api.get('/students/me/eligibility');
      if (eRes.data.success) {
        setEligibilityData(eRes.data.data.evaluations || []);
      }
    } catch (e) {
      console.error('Failed to load student dashboard:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentData();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const skillsArray = skillsInput.split(',').map(s => ({ skillName: s.trim() })).filter(s => s.skillName);
      const res = await api.put('/students/me', {
        cgpa: parseFloat(cgpa),
        backlogs: parseInt(backlogs),
        department,
        skills: skillsArray
      });
      if (res.data.success) {
        setMsg('Profile updated successfully!');
        fetchStudentData();
      }
    } catch (e: any) {
      setMsg(e.response?.data?.error?.message || 'Failed to update profile');
    }
  };

  const handleSubmitProfileVerification = async () => {
    try {
      const res = await api.post('/students/me/submit-verification');
      if (res.data.success) {
        setMsg('Profile submitted for T&P verification!');
        fetchStudentData();
      }
    } catch (e: any) {
      setMsg(e.response?.data?.error?.message || 'Failed to submit verification');
    }
  };

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectTitle.trim()) return;
    try {
      const currentProjects = profile?.projects || [];
      const updatedProjects = [...currentProjects, { title: projectTitle, technologies: projectTech, description: projectDesc }];
      await api.put('/students/me', { projects: updatedProjects });
      setProjectTitle('');
      setProjectTech('');
      setProjectDesc('');
      setMsg('Project added!');
      fetchStudentData();
    } catch (e) {
      setMsg('Failed to add project');
    }
  };

  const handleApply = async (internshipId: string) => {
    try {
      const res = await api.post(`/internships/${internshipId}/apply`);
      if (res.data.success) {
        setMsg('Application submitted successfully!');
        fetchStudentData();
      }
    } catch (e: any) {
      setMsg(e.response?.data?.error?.message || 'Application failed');
    }
  };

  const handleRespondOffer = async (offerId: string, response: 'ACCEPTED' | 'DECLINED') => {
    try {
      const res = await api.post(`/offers/${offerId}/respond`, { response });
      if (res.data.success) {
        setMsg(`Offer ${response.toLowerCase()}! Queued for T&P verification.`);
        fetchStudentData();
      }
    } catch (e: any) {
      setMsg('Failed to respond to offer');
    }
  };

  const handleSubmitProgressReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInternshipForProgress || !reportTasks.trim()) return;
    try {
      const res = await api.post(`/internships/${selectedInternshipForProgress}/progress-reports`, {
        weekNumber: parseInt(weekNum),
        tasks: reportTasks,
        learning: reportLearning,
        challenges: reportChallenges,
        hours: 40.0
      });
      if (res.data.success) {
        setMsg(`Week ${weekNum} report submitted to faculty mentor!`);
        setReportTasks('');
        setReportLearning('');
        setReportChallenges('');
        fetchStudentData();
      }
    } catch (e: any) {
      setMsg(e.response?.data?.error?.message || 'Failed to submit report');
    }
  };

  const handleRunSkillGap = async (vacId: string) => {
    setSelectedVacancyForGap(vacId);
    try {
      const res = await api.post('/ai/skill-gap', { internshipId: vacId });
      if (res.data.success) {
        setSkillGapResult(res.data.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRunResumeAnalyze = async () => {
    if (!resumeText.trim()) return;
    try {
      const res = await api.post('/ai/resume-analyze', { resumeText });
      if (res.data.success) {
        setResumeResult(res.data.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-400">Loading student workspace...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      {/* Header Banner */}
      <div className="glass-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold text-white">{profile?.fullName || 'Student Workspace'}</h1>
            <StatusBadge status={profile?.profileStatus || 'DRAFT'} />
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {profile?.studentCode} &bull; {profile?.department} ({profile?.passingYear}) &bull; CGPA: <strong className="text-white">{profile?.cgpa}</strong> &bull; Backlogs: <strong className="text-white">{profile?.backlogs}</strong>
          </p>
        </div>

        {profile?.profileStatus !== 'VERIFIED' && (
          <button onClick={handleSubmitProfileVerification} className="btn-primary text-xs flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4" />
            <span>Submit Profile for T&P Verification</span>
          </button>
        )}
      </div>

      {msg && (
        <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs rounded-xl flex items-center justify-between">
          <span>{msg}</span>
          <button onClick={() => setMsg('')} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-2 text-xs">
        <button
          onClick={() => setActiveTab('marketplace')}
          className={`px-4 py-2 rounded-xl font-semibold transition-all ${
            activeTab === 'marketplace' ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20' : 'text-slate-400 hover:text-white bg-slate-900'
          }`}
        >
          Internship Discovery ({vacancies.length})
        </button>
        <button
          onClick={() => setActiveTab('applications')}
          className={`px-4 py-2 rounded-xl font-semibold transition-all ${
            activeTab === 'applications' ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20' : 'text-slate-400 hover:text-white bg-slate-900'
          }`}
        >
          My Applications ({profile?.applications?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('progress')}
          className={`px-4 py-2 rounded-xl font-semibold transition-all ${
            activeTab === 'progress' ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20' : 'text-slate-400 hover:text-white bg-slate-900'
          }`}
        >
          Weekly Progress Reports
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2 rounded-xl font-semibold transition-all ${
            activeTab === 'profile' ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20' : 'text-slate-400 hover:text-white bg-slate-900'
          }`}
        >
          Profile & Skills
        </button>
        <button
          onClick={() => setActiveTab('skillgap')}
          className={`px-4 py-2 rounded-xl font-semibold transition-all ${
            activeTab === 'skillgap' ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20' : 'text-slate-400 hover:text-white bg-slate-900'
          }`}
        >
          ✨ AI Skill-Gap
        </button>
        <button
          onClick={() => setActiveTab('resume')}
          className={`px-4 py-2 rounded-xl font-semibold transition-all ${
            activeTab === 'resume' ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20' : 'text-slate-400 hover:text-white bg-slate-900'
          }`}
        >
          ✨ AI Resume Analyzer
        </button>
      </div>

      {/* TAB 1: INTERNSHIP MARKETPLACE */}
      {activeTab === 'marketplace' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {vacancies.map((v) => {
              const evalObj = eligibilityData.find(e => e.internship.id === v.id);
              const eligibility = evalObj?.result;
              const hasApplied = profile?.applications?.some((app: any) => app.internshipId === v.id);
              const reqSkills = JSON.parse(v.requiredSkills || '[]');

              return (
                <div key={v.id} className="glass-card p-6 flex flex-col justify-between space-y-4 border-slate-700/60 hover:border-cyan-500/40 transition-all">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">{v.company?.name}</span>
                        <h3 className="text-lg font-bold text-white mt-0.5">{v.title}</h3>
                      </div>
                      <StatusBadge status={v.mode} size="sm" />
                    </div>

                    <p className="text-xs text-slate-400 line-clamp-2">{v.description}</p>

                    <div className="grid grid-cols-3 gap-2 text-xs bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                      <div><span className="text-slate-500 block text-[10px]">Stipend</span> ₹{v.stipend}/mo</div>
                      <div><span className="text-slate-500 block text-[10px]">Duration</span> {v.durationMonths} Months</div>
                      <div><span className="text-slate-500 block text-[10px]">Location</span> {v.location}</div>
                    </div>

                    {/* Skills */}
                    <div className="flex flex-wrap gap-1.5">
                      {reqSkills.map((sk: string, idx: number) => (
                        <span key={idx} className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                          {sk}
                        </span>
                      ))}
                    </div>

                    {/* Eligibility Indicator */}
                    {eligibility && (
                      <EligibilityCard result={eligibility} />
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">Deadline: {v.deadline}</span>
                    {hasApplied ? (
                      <span className="text-xs font-semibold text-emerald-400 flex items-center space-x-1">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Applied</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => handleApply(v.id)}
                        disabled={eligibility && !eligibility.eligible}
                        className="btn-primary text-xs"
                      >
                        Apply Now
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: MY APPLICATIONS & OFFER RESPONSES */}
      {activeTab === 'applications' && (
        <div className="space-y-4">
          <div className="glass-card p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Application Tracking & Offers</h3>

            {(!profile?.applications || profile.applications.length === 0) ? (
              <p className="text-xs text-slate-400">You haven't submitted any applications yet.</p>
            ) : (
              <div className="space-y-4">
                {profile.applications.map((app: any) => (
                  <div key={app.id} className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-white text-sm">{app.internship?.title}</h4>
                        <p className="text-xs text-slate-400">{app.internship?.company?.name}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-lg border border-cyan-500/20">
                          {app.aiMatchScore}% AI Match
                        </span>
                        <StatusBadge status={app.status} />
                      </div>
                    </div>

                    {app.matchExplanation && (
                      <p className="text-xs text-slate-300 bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/60">
                        ✨ {app.matchExplanation}
                      </p>
                    )}

                    {/* Offer Section */}
                    {app.offer && (
                      <div className="p-3 bg-emerald-950/20 border border-emerald-500/30 rounded-xl space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-emerald-400">Offer Received</span>
                          <StatusBadge status={app.offer.status} size="sm" />
                        </div>
                        <p className="text-slate-300">Acceptance Deadline: {app.offer.acceptanceDeadline}</p>

                        {app.offer.studentResponse === 'PENDING' && (
                          <div className="flex space-x-2 pt-2">
                            <button
                              onClick={() => handleRespondOffer(app.offer.id, 'ACCEPTED')}
                              className="btn-primary text-xs py-1.5 px-3"
                            >
                              Accept Offer
                            </button>
                            <button
                              onClick={() => handleRespondOffer(app.offer.id, 'DECLINED')}
                              className="btn-secondary text-xs py-1.5 px-3 hover:text-rose-400"
                            >
                              Decline
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: WEEKLY PROGRESS REPORTS */}
      {activeTab === 'progress' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Submit Report Form */}
          <div className="glass-card p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Log Weekly Progress</h3>
            <form onSubmit={handleSubmitProgressReport} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 block mb-1">Select Active Internship</label>
                <select
                  value={selectedInternshipForProgress}
                  onChange={(e) => setSelectedInternshipForProgress(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-2.5"
                >
                  <option value="">-- Choose Internship --</option>
                  {profile?.applications?.filter((a: any) => a.status === 'SELECTED').map((a: any) => (
                    <option key={a.internship.id} value={a.internship.id}>
                      {a.internship.title} ({a.internship.company?.name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Week Number</label>
                <input
                  type="number"
                  value={weekNum}
                  onChange={(e) => setWeekNum(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-2.5"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Work Completed / Tasks</label>
                <textarea
                  rows={3}
                  value={reportTasks}
                  onChange={(e) => setReportTasks(e.target.value)}
                  placeholder="Summarize tasks completed this week..."
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-2.5"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Key Learnings</label>
                <textarea
                  rows={2}
                  value={reportLearning}
                  onChange={(e) => setReportLearning(e.target.value)}
                  placeholder="Technologies or skills acquired..."
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-2.5"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Challenges & Blockers</label>
                <textarea
                  rows={2}
                  value={reportChallenges}
                  onChange={(e) => setReportChallenges(e.target.value)}
                  placeholder="Any blockers or help needed..."
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-2.5"
                />
              </div>

              <button type="submit" className="w-full btn-primary text-xs py-2.5">
                Submit Report to Mentor
              </button>
            </form>
          </div>

          {/* Submitted Logs History */}
          <div className="lg:col-span-2 glass-card p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Submitted Report Logs & Mentor Feedback</h3>
            {(!profile?.progressReports || profile.progressReports.length === 0) ? (
              <p className="text-xs text-slate-400">No progress reports submitted yet.</p>
            ) : (
              <div className="space-y-3">
                {profile.progressReports.map((rep: any) => (
                  <div key={rep.id} className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">Week {rep.weekNumber} Report</span>
                      <StatusBadge status={rep.status} size="sm" />
                    </div>
                    <p className="text-slate-300"><strong>Tasks:</strong> {rep.tasks}</p>
                    {rep.learning && <p className="text-slate-400"><strong>Learnings:</strong> {rep.learning}</p>}
                    {rep.feedback && (
                      <div className="p-2.5 bg-cyan-950/30 border border-cyan-500/30 rounded-lg text-cyan-300 mt-2">
                        💬 <strong>Mentor Feedback:</strong> {rep.feedback}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: PROFILE & SKILLS EDITOR */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-card p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Academic Profile Details</h3>
            <form onSubmit={handleUpdateProfile} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1">CGPA</label>
                  <input
                    type="number"
                    step="0.01"
                    value={cgpa}
                    onChange={(e) => setCgpa(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-2.5"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Active Backlogs</label>
                  <input
                    type="number"
                    value={backlogs}
                    onChange={(e) => setBacklogs(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-2.5"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Department</label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-2.5"
                >
                  <option value="CSE">CSE</option>
                  <option value="IT">IT</option>
                  <option value="ECE">ECE</option>
                  <option value="MECH">MECH</option>
                  <option value="CIVIL">CIVIL</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Skills (comma separated)</label>
                <input
                  type="text"
                  value={skillsInput}
                  onChange={(e) => setSkillsInput(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-2.5"
                />
              </div>

              <button type="submit" className="btn-primary text-xs py-2.5">
                Save Profile Changes
              </button>
            </form>
          </div>

          {/* Projects Manager */}
          <div className="glass-card p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Add Project Experience</h3>
            <form onSubmit={handleAddProject} className="space-y-3 text-xs">
              <input
                type="text"
                placeholder="Project Title"
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-2.5"
              />
              <input
                type="text"
                placeholder="Technologies Used (e.g. React, Spring Boot)"
                value={projectTech}
                onChange={(e) => setProjectTech(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-2.5"
              />
              <textarea
                rows={2}
                placeholder="Project summary..."
                value={projectDesc}
                onChange={(e) => setProjectDesc(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-2.5"
              />
              <button type="submit" className="btn-secondary text-xs py-2.5">
                + Add Project
              </button>
            </form>

            <div className="space-y-2 pt-2 border-t border-slate-800">
              {profile?.projects?.map((proj: any) => (
                <div key={proj.id} className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-xs">
                  <h5 className="font-bold text-white">{proj.title}</h5>
                  <p className="text-slate-400 text-[11px]">{proj.technologies}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: AI SKILL-GAP ANALYZER */}
      {activeTab === 'skillgap' && (
        <div className="glass-card p-6 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              <span>AI Skill-Gap Analyzer</span>
            </h3>
            <p className="text-xs text-slate-400">Select a vacancy to analyze missing skills and get an AI learning roadmap.</p>
          </div>

          <div className="flex gap-3">
            <select
              value={selectedVacancyForGap}
              onChange={(e) => handleRunSkillGap(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-white text-xs rounded-xl p-2.5 flex-1"
            >
              <option value="">-- Select Vacancy --</option>
              {vacancies.map(v => (
                <option key={v.id} value={v.id}>{v.title} ({v.company?.name})</option>
              ))}
            </select>
          </div>

          {skillGapResult && (
            <div className="space-y-4 pt-4 border-t border-slate-800 text-xs">
              <div className="p-4 bg-cyan-950/20 border border-cyan-500/30 rounded-xl space-y-2">
                <span className="font-bold text-cyan-400 block">🤖 AI Learning Roadmap Advice</span>
                <p className="text-slate-200 leading-relaxed">{skillGapResult.aiAdvice}</p>
              </div>

              <div>
                <h4 className="font-bold text-white mb-2">Missing Required Skills:</h4>
                <div className="flex flex-wrap gap-2">
                  {skillGapResult.missingSkills.map((sk: string, i: number) => (
                    <span key={i} className="px-3 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/30 rounded-lg">
                      ✕ {sk}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 6: AI RESUME ANALYZER */}
      {activeTab === 'resume' && (
        <div className="glass-card p-6 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              <span>AI Resume Analyzer</span>
            </h3>
            <p className="text-xs text-slate-400">Paste your raw resume text below for instant AI feedback & scoring.</p>
          </div>

          <textarea
            rows={5}
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            placeholder="Paste resume content here..."
            className="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-xl p-3"
          />

          <button onClick={handleRunResumeAnalyze} className="btn-primary text-xs py-2.5">
            Analyze Resume with AI
          </button>

          {resumeResult && (
            <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-xl space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-sm">Resume Employability Score</span>
                <span className="text-2xl font-black text-cyan-400">{resumeResult.score}/100</span>
              </div>

              <div>
                <h5 className="font-bold text-emerald-400 mb-1">Strengths:</h5>
                <ul className="list-disc list-inside text-slate-300 space-y-1">
                  {resumeResult.strengths?.map((s: string, i: number) => <li key={i}>{s}</li>)}
                </ul>
              </div>

              <div>
                <h5 className="font-bold text-amber-400 mb-1">Areas for Improvement:</h5>
                <ul className="list-disc list-inside text-slate-300 space-y-1">
                  {resumeResult.suggestions?.map((s: string, i: number) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
