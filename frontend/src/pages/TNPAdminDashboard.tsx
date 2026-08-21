import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import {
  ShieldCheck, UserCheck, BarChart3, CheckCircle2, XCircle, AlertTriangle,
  FileText, Download, User, ExternalLink, Check, X, AlertCircle, Sparkles, Filter
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface TNPAdminDashboardProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export const TNPAdminDashboard: React.FC<TNPAdminDashboardProps> = ({
  activeTab: externalActiveTab,
  onTabChange
}) => {
  const [internalActiveTab, setInternalActiveTab] = useState<'students' | 'offers' | 'verifications' | 'mentors' | 'analytics' | 'ppo'>('verifications');

  const activeTab = (externalActiveTab as any) || internalActiveTab;

  const setActiveTab = (tab: any) => {
    setInternalActiveTab(tab);
    if (onTabChange) onTabChange(tab);
  };


  const [verificationFilter, setVerificationFilter] = useState<string>('ALL');

  const [studentStats, setStudentStats] = useState<any>({ total: 0, verified: 0, pending: 0, rejected: 0, correctionRequired: 0 });
  const [studentsList, setStudentsList] = useState<any[]>([]);
  const [offersList, setOffersList] = useState<any[]>([]);
  const [verifications, setVerifications] = useState<any[]>([]);
  const [mentors, setMentors] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [ppos, setPpos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Student Review Modal State
  const [selectedReviewStudent, setSelectedReviewStudent] = useState<any>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [actionType, setActionType] = useState<'APPROVE' | 'REJECT' | 'CORRECTION' | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  // Offer Review Modal State
  const [selectedReviewOffer, setSelectedReviewOffer] = useState<any>(null);
  const [offerReviewModalOpen, setOfferReviewModalOpen] = useState(false);
  const [offerActionType, setOfferActionType] = useState<'APPROVE' | 'REJECT' | 'CORRECTION' | null>(null);
  const [offerActionReason, setOfferActionReason] = useState('');
  const [submittingOfferAction, setSubmittingOfferAction] = useState(false);

  // Mentor Assign State
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedInternshipId, setSelectedInternshipId] = useState('');
  const [selectedMentorId, setSelectedMentorId] = useState('');

  const [msg, setMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const fetchTNPData = async () => {
    try {
      const statsRes = await api.get('/tnp/students/stats');
      if (statsRes.data.success) setStudentStats(statsRes.data.data);

      const sRes = await api.get('/tnp/students/pending');
      if (sRes.data.success) setStudentsList(sRes.data.data);

      const offRes = await api.get('/tnp/offers');
      if (offRes.data.success) setOffersList(offRes.data.data);

      const vRes = await api.get('/tnp/verification-queue');
      if (vRes.data.success) setVerifications(vRes.data.data);

      const mRes = await api.get('/tnp/list');
      if (mRes.data.success) setMentors(mRes.data.data);

      const aRes = await api.get('/analytics/overview');
      if (aRes.data.success) setAnalytics(aRes.data.data);

      const pRes = await api.get('/tnp/ppo');
      if (pRes.data.success) setPpos(pRes.data.data);
    } catch (e) {
      console.error('Failed to fetch T&P data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTNPData();
  }, []);

  const handleDownloadDocument = async (docId: string, originalName: string) => {
    try {
      const res = await api.get(`/documents/${docId}/file`, { responseType: 'blob' });
      const contentType = (res.headers['content-type'] as string) || 'application/pdf';
      const url = window.URL.createObjectURL(new Blob([res.data], { type: contentType }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', originalName || 'student_document.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => window.URL.revokeObjectURL(url), 10000);
    } catch (err: any) {
      const token = localStorage.getItem('token');
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
      window.open(`${baseUrl}/documents/${docId}/file?token=${token}`, '_blank');
    }
  };

  const handleOpenReview = async (studentId: string) => {
    try {
      const res = await api.get(`/tnp/students/${studentId}/review`);
      if (res.data.success) {
        setSelectedReviewStudent(res.data.data);
        setReviewModalOpen(true);
        setActionType(null);
        setActionReason('');
      }
    } catch (e) {
      setErrorMsg('Failed to fetch student review details');
    }
  };

  const handleProcessVerification = async (targetStatus: 'APPROVED' | 'REJECTED' | 'CORRECTION_REQUIRED') => {
    if (!selectedReviewStudent) return;
    if ((targetStatus === 'REJECTED' || targetStatus === 'CORRECTION_REQUIRED') && !actionReason.trim()) {
      setErrorMsg('Please provide a mandatory reason / remark.');
      return;
    }

    setSubmittingAction(true);
    setErrorMsg('');
    try {
      const res = await api.post(`/tnp/students/${selectedReviewStudent.student.id}/verify`, {
        status: targetStatus,
        reason: actionReason || undefined,
        remarks: actionReason || undefined
      });

      if (res.data.success) {
        setMsg(`Student profile updated to ${targetStatus}!`);
        setReviewModalOpen(false);
        fetchTNPData();
      }
    } catch (e: any) {
      setErrorMsg(e.response?.data?.error?.message || 'Failed to update verification status');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleOpenOfferReview = async (offerId: string) => {
    try {
      const res = await api.get(`/tnp/offers/${offerId}/review`);
      if (res.data.success) {
        setSelectedReviewOffer(res.data.data);
        setOfferReviewModalOpen(true);
        setOfferActionType(null);
        setOfferActionReason('');
      }
    } catch (e) {
      setErrorMsg('Failed to fetch offer review dossier');
    }
  };

  const handleProcessOfferVerification = async (targetStatus: 'APPROVED' | 'REJECTED' | 'CORRECTION_REQUIRED') => {
    if (!selectedReviewOffer) return;
    if ((targetStatus === 'REJECTED' || targetStatus === 'CORRECTION_REQUIRED') && !offerActionReason.trim()) {
      setErrorMsg('Please provide a mandatory reason / remark for rejection or correction.');
      return;
    }

    setSubmittingOfferAction(true);
    setErrorMsg('');
    try {
      const res = await api.post(`/tnp/offers/${selectedReviewOffer.offer.id}/verify`, {
        status: targetStatus,
        reason: offerActionReason || undefined,
        remarks: offerActionReason || undefined
      });

      if (res.data.success) {
        setMsg(`Offer letter verification updated to ${targetStatus}!`);
        setOfferReviewModalOpen(false);
        fetchTNPData();
      }
    } catch (e: any) {
      setErrorMsg(e.response?.data?.error?.message || 'Failed to update offer verification');
    } finally {
      setSubmittingOfferAction(false);
    }
  };

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
      setErrorMsg(e.response?.data?.error?.message || 'Failed to assign mentor');
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-400">Loading T&P governance portal...</div>;

  const filteredStudents = studentsList.filter(s => {
    if (verificationFilter === 'ALL') return true;
    if (verificationFilter === 'PENDING') return s.profileStatus === 'SUBMITTED' || s.profileStatus === 'UNDER_REVIEW' || s.profileStatus === 'DRAFT';
    if (verificationFilter === 'CORRECTION') return s.profileStatus === 'CORRECTION_REQUIRED';
    if (verificationFilter === 'VERIFIED') return s.profileStatus === 'VERIFIED';
    if (verificationFilter === 'REJECTED') return s.profileStatus === 'REJECTED';
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      {/* Top Banner */}
      <div className="glass-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-amber-500/30">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Training & Placement (T&P) Governance</h1>
            <p className="text-xs text-slate-400">Institutional Student Profile Verification, Deterministic Eligibility, & Placements</p>
          </div>
        </div>
      </div>

      {msg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl flex items-center justify-between">
          <span>{msg}</span>
          <button onClick={() => setMsg('')} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}
      {errorMsg && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg('')} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
        <div className="glass-card p-4 border-amber-500/30">
          <span className="text-slate-400 block font-semibold">Pending Review</span>
          <span className="text-2xl font-black text-amber-400 mt-1 block">
            {studentStats.pending}
          </span>
        </div>
        <div className="glass-card p-4 border-emerald-500/30">
          <span className="text-slate-400 block font-semibold">Verified Profiles</span>
          <span className="text-2xl font-black text-emerald-400 mt-1 block">
            {studentStats.verified}
          </span>
        </div>
        <div className="glass-card p-4 border-cyan-500/30">
          <span className="text-slate-400 block font-semibold">Corrections Required</span>
          <span className="text-2xl font-black text-cyan-400 mt-1 block">
            {studentStats.correctionRequired}
          </span>
        </div>
        <div className="glass-card p-4 border-rose-500/30">
          <span className="text-slate-400 block font-semibold">Rejected Profiles</span>
          <span className="text-2xl font-black text-rose-400 mt-1 block">
            {studentStats.rejected}
          </span>
        </div>
        <div className="glass-card p-4 border-indigo-500/30">
          <span className="text-slate-400 block font-semibold">Total Registered</span>
          <span className="text-2xl font-black text-indigo-400 mt-1 block">
            {studentStats.total}
          </span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-2 text-xs">
        <button
          onClick={() => setActiveTab('students')}
          className={`px-4 py-2 rounded-xl font-semibold transition-all ${
            activeTab === 'students' ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20' : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          🎓 Student Profile Verification ({studentStats.pending})
        </button>
        <button
          onClick={() => setActiveTab('offers')}
          className={`px-4 py-2 rounded-xl font-semibold transition-all ${
            activeTab === 'offers' ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20' : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          💼 Offer Letters & Selection Verification ({offersList.filter(o => o.status === 'TNP_REVIEW' || o.status === 'ISSUED').length})
        </button>
        <button
          onClick={() => setActiveTab('verifications')}
          className={`px-4 py-2 rounded-xl font-semibold transition-all ${
            activeTab === 'verifications' ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20' : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          📄 Unified Queue ({verifications.filter(v => v.status === 'PENDING').length})
        </button>
        <button
          onClick={() => setActiveTab('mentors')}
          className={`px-4 py-2 rounded-xl font-semibold transition-all ${
            activeTab === 'mentors' ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20' : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          👨‍🏫 Faculty Mentor Assignment
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2 rounded-xl font-semibold transition-all ${
            activeTab === 'analytics' ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20' : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          📊 Institutional Analytics
        </button>
        <button
          onClick={() => setActiveTab('ppo')}
          className={`px-4 py-2 rounded-xl font-semibold transition-all ${
            activeTab === 'ppo' ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20' : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          💼 PPO Registry ({ppos.length})
        </button>
      </div>

      {/* TAB 1: STUDENT PROFILE VERIFICATION QUEUE */}
      {activeTab === 'students' && (
        <div className="space-y-4">
          {/* Status Filter Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-1.5 bg-slate-900 rounded-2xl border border-slate-800 text-xs">
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setVerificationFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
                  verificationFilter === 'ALL' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                All Students ({studentsList.length})
              </button>
              <button
                onClick={() => setVerificationFilter('PENDING')}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
                  verificationFilter === 'PENDING' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Pending Verification ({studentStats.pending})
              </button>
              <button
                onClick={() => setVerificationFilter('CORRECTION')}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
                  verificationFilter === 'CORRECTION' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Correction Required ({studentStats.correctionRequired})
              </button>
              <button
                onClick={() => setVerificationFilter('VERIFIED')}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
                  verificationFilter === 'VERIFIED' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Verified Profiles ({studentStats.verified})
              </button>
              <button
                onClick={() => setVerificationFilter('REJECTED')}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
                  verificationFilter === 'REJECTED' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Rejected ({studentStats.rejected})
              </button>
            </div>
          </div>

          {/* Student Review Cards */}
          {filteredStudents.length === 0 ? (
            <div className="glass-card p-8 text-center text-slate-400 text-xs">
              No students found in this verification queue.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredStudents.map((s) => {
                const compScore = s.completeness?.completenessScore || 0;
                return (
                  <div
                    key={s.id}
                    className="glass-card p-5 border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-xs hover:border-amber-500/40 transition-all"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center text-white font-bold">
                          {s.fullName.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="font-bold text-white text-sm">{s.fullName}</h4>
                            <span className="font-mono text-[10px] text-slate-400">({s.studentCode})</span>
                            <StatusBadge status={s.profileStatus} size="sm" />
                          </div>
                          <p className="text-slate-400 text-[11px] mt-0.5">
                            {s.department} &bull; Batch {s.passingYear} &bull; CGPA: <strong className="text-white">{s.cgpa}</strong> &bull; Backlogs: <strong className="text-white">{s.backlogs}</strong> &bull; Email: {s.user?.email}
                          </p>
                        </div>
                      </div>

                      {/* Documents Summary & Remarks */}
                      <div className="flex flex-wrap items-center gap-2 text-[11px]">
                        <span className="text-slate-400">Documents ({s.documents?.length || 0}):</span>
                        {s.documents && s.documents.length > 0 ? (
                          s.documents.map((d: any, idx: number) => (
                            <span key={idx} className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-cyan-400">
                              {d.documentType}
                            </span>
                          ))
                        ) : (
                          <span className="text-amber-400">No documents uploaded</span>
                        )}
                        {s.verificationRemark && (
                          <span className="text-slate-400 italic">
                            &bull; Remark: <span className="text-amber-300">"{s.verificationRemark}"</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      {/* Completeness Badge */}
                      <div className="text-right sm:text-center p-2 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-500 block">Completeness</span>
                        <span className={`font-black text-xs ${compScore >= 80 ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {compScore}%
                        </span>
                      </div>

                      <button
                        onClick={() => handleOpenReview(s.id)}
                        className="btn-primary text-xs py-2 px-4 whitespace-nowrap bg-amber-600 hover:bg-amber-500 flex items-center justify-center space-x-1.5"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        <span>Review & Verify</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL: COMPREHENSIVE STUDENT REVIEW */}
      {reviewModalOpen && selectedReviewStudent && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass-card max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 border-amber-500/40">
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-xl font-bold text-white">{selectedReviewStudent.student.fullName}</h3>
                  <StatusBadge status={selectedReviewStudent.student.profileStatus} />
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Student Code: {selectedReviewStudent.student.studentCode} &bull; Email: {selectedReviewStudent.student.user?.email}
                </p>
              </div>
              <button
                onClick={() => setReviewModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            {/* Academic Information Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-900/90 p-4 rounded-xl border border-slate-800 text-xs">
              <div>
                <span className="text-slate-500 block text-[10px]">Department</span>
                <span className="font-bold text-white text-sm">{selectedReviewStudent.student.department}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Passing Year</span>
                <span className="font-bold text-white text-sm">{selectedReviewStudent.student.passingYear}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Cumulative CGPA</span>
                <span className="font-bold text-cyan-400 text-sm">{selectedReviewStudent.student.cgpa} / 10.0</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Active Backlogs</span>
                <span className={`font-bold text-sm ${selectedReviewStudent.student.backlogs === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {selectedReviewStudent.student.backlogs}
                </span>
              </div>
            </div>

            {/* Completeness Engine Breakdown */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-300 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  Authoritative Profile Completeness:
                </span>
                <span className="font-black text-cyan-400">{selectedReviewStudent.completeness?.completenessScore || 0}%</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <span className={`p-1.5 rounded border ${selectedReviewStudent.completeness?.breakdown?.personal?.completed ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300' : 'bg-slate-900 text-slate-500'}`}>
                  Personal (20%)
                </span>
                <span className={`p-1.5 rounded border ${selectedReviewStudent.completeness?.breakdown?.academic?.completed ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300' : 'bg-slate-900 text-slate-500'}`}>
                  Academic (20%)
                </span>
                <span className={`p-1.5 rounded border ${selectedReviewStudent.completeness?.breakdown?.skills?.completed ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300' : 'bg-slate-900 text-slate-500'}`}>
                  Skills (15%)
                </span>
                <span className={`p-1.5 rounded border ${selectedReviewStudent.completeness?.breakdown?.resume?.completed ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300' : 'bg-slate-900 text-slate-500'}`}>
                  Resume (15%)
                </span>
              </div>
            </div>

            {/* Document Verification Section */}
            <div className="space-y-2 text-xs">
              <h4 className="font-bold text-white">Attached Verification Documents ({selectedReviewStudent.documents?.length || 0}):</h4>
              {selectedReviewStudent.documents?.length === 0 ? (
                <p className="text-amber-400">⚠️ No documents attached to this profile.</p>
              ) : (
                <div className="space-y-2">
                  {selectedReviewStudent.documents.map((doc: any) => (
                    <div key={doc.id} className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <FileText className="w-4 h-4 text-cyan-400" />
                        <div>
                          <span className="font-bold text-white block">{doc.originalName}</span>
                          <span className="text-[10px] text-slate-400">{doc.documentType} &bull; {(doc.size / 1024).toFixed(1)} KB</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDownloadDocument(doc.id, doc.originalName)}
                        className="btn-secondary text-[11px] py-1.5 px-3 flex items-center space-x-1.5 hover:text-cyan-300 font-semibold cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>View / Download</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons / Decision Section */}
            <div className="pt-4 border-t border-slate-800 space-y-4">
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setActionType('APPROVE')}
                  className={`btn-primary text-xs py-2.5 px-4 flex-1 ${actionType === 'APPROVE' ? 'ring-2 ring-emerald-400' : ''}`}
                >
                  ✅ Approve Profile
                </button>
                <button
                  type="button"
                  onClick={() => setActionType('CORRECTION')}
                  className={`btn-secondary text-xs py-2.5 px-4 flex-1 hover:text-cyan-300 ${actionType === 'CORRECTION' ? 'ring-2 ring-cyan-400' : ''}`}
                >
                  ✏️ Request Corrections
                </button>
                <button
                  type="button"
                  onClick={() => setActionType('REJECT')}
                  className={`btn-secondary text-xs py-2.5 px-4 flex-1 hover:text-rose-400 ${actionType === 'REJECT' ? 'ring-2 ring-rose-400' : ''}`}
                >
                  ❌ Reject Profile
                </button>
              </div>

              {actionType && (
                <div className="space-y-3 bg-slate-900/90 p-4 rounded-xl border border-slate-800 text-xs">
                  <label className="text-slate-300 font-semibold block">
                    {actionType === 'APPROVE' ? 'Approval Remark (Optional)' : actionType === 'CORRECTION' ? 'Itemized Correction Remarks (Mandatory)' : 'Rejection Reason (Mandatory)'}
                  </label>
                  <textarea
                    rows={3}
                    required={actionType !== 'APPROVE'}
                    placeholder={actionType === 'CORRECTION' ? 'e.g. Please re-upload clearer marksheet...' : 'Enter reason / remarks for student...'}
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl p-2.5"
                  />
                  <button
                    type="button"
                    disabled={submittingAction}
                    onClick={() => {
                      if (actionType === 'APPROVE') handleProcessVerification('APPROVED');
                      else if (actionType === 'CORRECTION') handleProcessVerification('CORRECTION_REQUIRED');
                      else if (actionType === 'REJECT') handleProcessVerification('REJECTED');
                    }}
                    className="w-full btn-primary text-xs py-2.5"
                  >
                    {submittingAction ? 'Executing Decision...' : `Confirm ${actionType}`}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB: OFFER LETTERS & SELECTION VERIFICATION */}
      {activeTab === 'offers' && (
        <div className="space-y-4">
          <div className="glass-card p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                  <ShieldCheck className="w-5 h-5 text-amber-400" />
                  <span>Institutional Offer Verification & Selection Governance</span>
                </h3>
                <p className="text-xs text-slate-400">Review selected student credentials, employer accreditation, compensation terms, and contracts.</p>
              </div>
            </div>

            {offersList.length === 0 ? (
              <p className="text-xs text-slate-400">No offer letters currently submitted for verification.</p>
            ) : (
              <div className="space-y-3">
                {offersList.map((off: any) => (
                  <div
                    key={off.id}
                    className="p-4 bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-xl transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-bold text-white">{off.application?.student?.fullName}</span>
                        <StatusBadge status={off.status} size="sm" />
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          off.studentResponse === 'ACCEPTED'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : off.studentResponse === 'DECLINED'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          Student Response: {off.studentResponse}
                        </span>
                      </div>

                      <p className="text-slate-300">
                        <strong className="text-white">{off.role || off.application?.internship?.title}</strong> at <strong className="text-cyan-400">{off.application?.internship?.company?.name}</strong>
                      </p>

                      <div className="flex flex-wrap items-center gap-3 text-slate-400 text-[11px]">
                        <span>Dept: <strong className="text-white">{off.application?.student?.department}</strong></span>
                        <span>CGPA: <strong className="text-white">{off.application?.student?.cgpa}</strong></span>
                        <span>Stipend: <strong className="text-emerald-400">₹{off.stipend?.toLocaleString()}/mo</strong></span>
                        <span>Location: {off.location}</span>
                        <span>Verification Code: <span className="font-mono text-cyan-400">{off.verificationCode?.slice(0, 8)}...</span></span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleOpenOfferReview(off.id)}
                      className="btn-primary text-xs py-2 px-4 whitespace-nowrap bg-amber-600 hover:bg-amber-500 font-semibold flex items-center justify-center space-x-1.5"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Review Offer Dossier</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: COMPREHENSIVE OFFER REVIEW DOSSIER */}
      {offerReviewModalOpen && selectedReviewOffer && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass-card max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 border-amber-500/40">
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-xl font-bold text-white">Offer Verification Dossier</h3>
                  <StatusBadge status={selectedReviewOffer.offer.status} />
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Candidate: <strong className="text-white">{selectedReviewOffer.student.fullName}</strong> &bull; Employer: <strong className="text-cyan-400">{selectedReviewOffer.company?.name}</strong>
                </p>
              </div>
              <button
                onClick={() => setOfferReviewModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            {/* Offer Terms & Compensation Breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-900/90 p-4 rounded-xl border border-slate-800 text-xs">
              <div>
                <span className="text-slate-500 block text-[10px]">Position Role</span>
                <span className="font-bold text-white text-sm">{selectedReviewOffer.offer.role}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Monthly Stipend</span>
                <span className="font-bold text-emerald-400 text-sm">₹{selectedReviewOffer.offer.stipend?.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Work Location</span>
                <span className="font-bold text-cyan-400 text-sm">{selectedReviewOffer.offer.location}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Student Response</span>
                <span className="font-bold text-white text-sm">{selectedReviewOffer.offer.studentResponse}</span>
              </div>
            </div>

            {/* Terms and Duration */}
            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1 text-xs">
              <span className="font-semibold text-slate-300 block">Internship Period & Contract Terms:</span>
              <p className="text-slate-400 text-[11px]">
                Duration: {selectedReviewOffer.offer.startDate || 'TBD'} to {selectedReviewOffer.offer.endDate || 'TBD'} &bull; Deadline: {selectedReviewOffer.offer.acceptanceDeadline}
              </p>
              <p className="text-slate-300 text-xs mt-2 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                {selectedReviewOffer.offer.terms || 'Standard institutional internship terms apply.'}
              </p>
            </div>

            {/* Student Profile & Completeness Snapshot */}
            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2 text-xs">
              <span className="font-semibold text-slate-300 block">Candidate Academic Standing:</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-300">
                <span>Dept: <strong>{selectedReviewOffer.student.department}</strong></span>
                <span>CGPA: <strong>{selectedReviewOffer.student.cgpa} / 10.0</strong></span>
                <span>Backlogs: <strong>{selectedReviewOffer.student.backlogs}</strong></span>
                <span>Profile Completeness: <strong className="text-cyan-400">{selectedReviewOffer.studentCompleteness?.completenessScore || 0}%</strong></span>
              </div>
            </div>

            {/* Decision Controls */}
            <div className="p-4 bg-slate-900/90 rounded-2xl border border-slate-800 space-y-4 text-xs">
              <h4 className="font-bold text-white">T&P Verification Decision</h4>

              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setOfferActionType('APPROVE')}
                  className={`p-3 rounded-xl border font-semibold flex items-center justify-center space-x-1.5 transition-all ${
                    offerActionType === 'APPROVE'
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-600/20'
                      : 'bg-slate-950 border-slate-800 text-emerald-400 hover:border-emerald-500/50'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  <span>Approve Offer</span>
                </button>

                <button
                  type="button"
                  onClick={() => setOfferActionType('CORRECTION')}
                  className={`p-3 rounded-xl border font-semibold flex items-center justify-center space-x-1.5 transition-all ${
                    offerActionType === 'CORRECTION'
                      ? 'bg-cyan-600 text-white border-cyan-500 shadow-lg shadow-cyan-600/20'
                      : 'bg-slate-950 border-slate-800 text-cyan-400 hover:border-cyan-500/50'
                  }`}
                >
                  <AlertCircle className="w-4 h-4" />
                  <span>Request Correction</span>
                </button>

                <button
                  type="button"
                  onClick={() => setOfferActionType('REJECT')}
                  className={`p-3 rounded-xl border font-semibold flex items-center justify-center space-x-1.5 transition-all ${
                    offerActionType === 'REJECT'
                      ? 'bg-rose-600 text-white border-rose-500 shadow-lg shadow-rose-600/20'
                      : 'bg-slate-950 border-slate-800 text-rose-400 hover:border-rose-500/50'
                  }`}
                >
                  <X className="w-4 h-4" />
                  <span>Reject Offer</span>
                </button>
              </div>

              {offerActionType && (
                <div className="space-y-3 pt-2">
                  <div>
                    <label className="text-slate-300 block mb-1">
                      {offerActionType === 'APPROVE'
                        ? 'Verification Remark (Optional):'
                        : offerActionType === 'CORRECTION'
                        ? 'Required Correction Remarks (Mandatory):'
                        : 'Institutional Rejection Reason (Mandatory):'}
                    </label>
                    <textarea
                      rows={3}
                      required={offerActionType !== 'APPROVE'}
                      value={offerActionReason}
                      onChange={(e) => setOfferActionReason(e.target.value)}
                      placeholder={
                        offerActionType === 'APPROVE'
                          ? 'e.g. Terms verified against AICTE guidelines. Eligible for academic credits.'
                          : offerActionType === 'CORRECTION'
                          ? 'e.g. Please clarify remote work expectations and correct end date.'
                          : 'e.g. Unaccredited company or unapproved terms.'
                      }
                      className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl p-2.5"
                    />
                  </div>

                  <button
                    type="button"
                    disabled={submittingOfferAction}
                    onClick={() => {
                      if (offerActionType === 'APPROVE') handleProcessOfferVerification('APPROVED');
                      else if (offerActionType === 'CORRECTION') handleProcessOfferVerification('CORRECTION_REQUIRED');
                      else if (offerActionType === 'REJECT') handleProcessOfferVerification('REJECTED');
                    }}
                    className="w-full btn-primary text-xs py-2.5 bg-amber-600 hover:bg-amber-500 font-semibold"
                  >
                    {submittingOfferAction ? 'Processing Decision...' : `Confirm & Record ${offerActionType}`}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: GENERAL VERIFICATION QUEUES */}
      {activeTab === 'verifications' && (
        <div className="glass-card p-6 space-y-4">
          <h3 className="text-lg font-bold text-white">General Verification Queue</h3>
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

      {/* TAB 3: FACULTY MENTOR ASSIGNMENT */}
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

      {/* TAB 4: INSTITUTIONAL ANALYTICS */}
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

      {/* TAB 5: PPO REGISTRY */}
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
