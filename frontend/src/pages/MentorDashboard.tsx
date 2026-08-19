import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { UserCheck, CheckCircle2, AlertTriangle, FileText, Send, MessageSquare } from 'lucide-react';

export const MentorDashboard: React.FC = () => {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'students' | 'reports' | 'evaluations'>('students');

  // Report Review State
  const [selectedReportId, setSelectedReportId] = useState('');
  const [feedbackText, setFeedbackText] = useState('');

  // Evaluation State
  const [evalStudentId, setEvalStudentId] = useState('');
  const [evalInternshipId, setEvalInternshipId] = useState('');
  const [tech, setTech] = useState('9.0');
  const [prob, setProb] = useState('8.5');
  const [comm, setComm] = useState('8.5');
  const [prof, setProf] = useState('9.0');
  const [team, setTeam] = useState('9.0');
  const [comments, setComments] = useState('');

  const [msg, setMsg] = useState('');

  const fetchMentorData = async () => {
    try {
      const aRes = await api.get('/mentors/me/assignments');
      if (aRes.data.success) setAssignments(aRes.data.data);

      const rRes = await api.get('/mentors/me/progress-reports');
      if (rRes.data.success) setReports(rRes.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMentorData();
  }, []);

  const handleReviewReport = async (repId: string, status: 'APPROVED' | 'CHANGES_REQUIRED') => {
    try {
      const res = await api.patch(`/reports/${repId}/review`, {
        status,
        feedback: feedbackText || (status === 'APPROVED' ? 'Approved by faculty mentor.' : 'Please provide further evidence.')
      });
      if (res.data.success) {
        setMsg(`Weekly report marked as ${status}!`);
        setFeedbackText('');
        fetchMentorData();
      }
    } catch (e) {
      setMsg('Failed to review report');
    }
  };

  const handleSubmitMentorEval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evalInternshipId || !evalStudentId) return;
    try {
      const res = await api.post(`/internships/${evalInternshipId}/evaluations`, {
        studentId: evalStudentId,
        technicalScore: parseFloat(tech),
        problemSolvingScore: parseFloat(prob),
        communicationScore: parseFloat(comm),
        professionalismScore: parseFloat(prof),
        teamworkScore: parseFloat(team),
        comments
      });
      if (res.data.success) {
        setMsg('Mentor evaluation submitted successfully!');
        setComments('');
      }
    } catch (e) {
      setMsg('Failed to submit evaluation');
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-400">Loading mentor dashboard...</div>;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      {/* Header Banner */}
      <div className="glass-card p-6 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <UserCheck className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Faculty Mentor Workspace</h1>
            <p className="text-xs text-slate-400">Assigned Student Guidance, Weekly Reports & Evaluations</p>
          </div>
        </div>

        <div className="text-right text-xs">
          <span className="text-slate-400 block">Assigned Mentees</span>
          <span className="text-xl font-bold text-emerald-400">{assignments.length} Students</span>
        </div>
      </div>

      {msg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl flex items-center justify-between">
          <span>{msg}</span>
          <button onClick={() => setMsg('')} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-800 pb-2 text-xs">
        <button
          onClick={() => setActiveTab('students')}
          className={`px-4 py-2 rounded-xl font-semibold ${activeTab === 'students' ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-slate-400'}`}
        >
          Assigned Students ({assignments.length})
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-2 rounded-xl font-semibold ${activeTab === 'reports' ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-slate-400'}`}
        >
          Weekly Reports Review Queue ({reports.filter(r => r.status === 'SUBMITTED').length})
        </button>
        <button
          onClick={() => setActiveTab('evaluations')}
          className={`px-4 py-2 rounded-xl font-semibold ${activeTab === 'evaluations' ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-slate-400'}`}
        >
          Final Mentor Evaluation Rubric
        </button>
      </div>

      {/* TAB 1: ASSIGNED STUDENTS */}
      {activeTab === 'students' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {assignments.map((asg) => (
            <div key={asg.id} className="glass-card p-6 border-slate-700/60 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-white text-base">{asg.student?.fullName}</h3>
                  <p className="text-xs text-slate-400">{asg.student?.department} &bull; CGPA: {asg.student?.cgpa}</p>
                </div>
                <StatusBadge status={asg.status} />
              </div>

              <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-xs space-y-1">
                <span className="text-slate-500 block text-[10px]">Internship Vacancy:</span>
                <span className="font-bold text-slate-200 block">{asg.internship?.title}</span>
                <span className="text-cyan-400">{asg.internship?.company?.name}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: WEEKLY REPORTS REVIEW QUEUE */}
      {activeTab === 'reports' && (
        <div className="glass-card p-6 space-y-4">
          <h3 className="text-lg font-bold text-white">Weekly Progress Report Review Queue</h3>
          {reports.length === 0 ? (
            <p className="text-xs text-slate-400">No reports submitted for review.</p>
          ) : (
            <div className="space-y-4">
              {reports.map((rep) => (
                <div key={rep.id} className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-white text-sm">{rep.student?.fullName} &bull; Week {rep.weekNumber} Report</h4>
                      <p className="text-slate-400">{rep.internship?.company?.name} - {rep.internship?.title}</p>
                    </div>
                    <StatusBadge status={rep.status} size="sm" />
                  </div>

                  <div className="space-y-1.5 text-slate-300">
                    <p><strong>Tasks Completed:</strong> {rep.tasks}</p>
                    {rep.learning && <p className="text-slate-400"><strong>Learnings:</strong> {rep.learning}</p>}
                    {rep.challenges && <p className="text-rose-300"><strong>Challenges:</strong> {rep.challenges}</p>}
                  </div>

                  {rep.status === 'SUBMITTED' && (
                    <div className="pt-3 border-t border-slate-800 space-y-2">
                      <input
                        type="text"
                        placeholder="Write feedback for student..."
                        value={selectedReportId === rep.id ? feedbackText : ''}
                        onChange={(e) => { setSelectedReportId(rep.id); setFeedbackText(e.target.value); }}
                        className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl p-2.5"
                      />
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleReviewReport(rep.id, 'APPROVED')}
                          className="btn-primary text-xs py-1.5 px-3"
                        >
                          Approve Report
                        </button>
                        <button
                          onClick={() => handleReviewReport(rep.id, 'CHANGES_REQUIRED')}
                          className="btn-secondary text-xs py-1.5 px-3 hover:text-rose-400"
                        >
                          Request Changes
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: FINAL MENTOR EVALUATION */}
      {activeTab === 'evaluations' && (
        <div className="glass-card p-6 space-y-4 max-w-xl">
          <h3 className="text-lg font-bold text-white">Faculty Mentor Evaluation Rubric</h3>
          <form onSubmit={handleSubmitMentorEval} className="space-y-3 text-xs">
            <div>
              <label className="text-slate-300 block mb-1">Select Mentee Student</label>
              <select
                value={evalStudentId}
                onChange={(e) => {
                  setEvalStudentId(e.target.value);
                  const asg = assignments.find(a => a.studentId === e.target.value);
                  if (asg) setEvalInternshipId(asg.internshipId);
                }}
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-2.5"
              >
                <option value="">-- Choose Mentee --</option>
                {assignments.map(a => (
                  <option key={a.studentId} value={a.studentId}>{a.student?.fullName}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-300 block mb-1">Technical Skills (1-10)</label>
                <input type="number" step="0.1" value={tech} onChange={(e) => setTech(e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-2.5" />
              </div>
              <div>
                <label className="text-slate-300 block mb-1">Problem Solving (1-10)</label>
                <input type="number" step="0.1" value={prob} onChange={(e) => setProb(e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-2.5" />
              </div>
              <div>
                <label className="text-slate-300 block mb-1">Communication (1-10)</label>
                <input type="number" step="0.1" value={comm} onChange={(e) => setComm(e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-2.5" />
              </div>
              <div>
                <label className="text-slate-300 block mb-1">Professionalism (1-10)</label>
                <input type="number" step="0.1" value={prof} onChange={(e) => setProf(e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-2.5" />
              </div>
            </div>

            <div>
              <label className="text-slate-300 block mb-1">Mentor Evaluation Remarks</label>
              <textarea rows={3} value={comments} onChange={(e) => setComments(e.target.value)} placeholder="Final mentor notes..." className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-2.5" />
            </div>

            <button type="submit" className="w-full btn-primary text-xs py-2.5">
              Submit Mentor Evaluation
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
