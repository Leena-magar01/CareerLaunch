import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { EligibilityCard } from '../components/EligibilityCard';
import {
  GraduationCap, Search, CheckCircle2, ShieldCheck, Sparkles,
  FileText, Clock, Award, Briefcase, Plus, Send, AlertTriangle,
  ChevronRight, User, Phone, MapPin, Globe, Linkedin, Github,
  UploadCloud, Trash2, ExternalLink, Check, X, AlertCircle, Eye, Download
} from 'lucide-react';

interface StudentDashboardProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  activeTab: externalActiveTab,
  onTabChange
}) => {
  const [internalActiveTab, setInternalActiveTab] = useState<'profile' | 'marketplace' | 'applications' | 'progress' | 'skillgap' | 'resume'>('marketplace');

  const activeTab = (externalActiveTab as any) || internalActiveTab;

  const setActiveTab = (tab: any) => {
    setInternalActiveTab(tab);
    if (onTabChange) onTabChange(tab);
  };


  const [profileTab, setProfileTab] = useState<'personal' | 'academic' | 'skills' | 'projects' | 'experience' | 'certifications' | 'preferences' | 'documents'>('personal');
  
  const [profile, setProfile] = useState<any>(null);
  const [vacancies, setVacancies] = useState<any[]>([]);
  const [eligibilityData, setEligibilityData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showMissingAlert, setShowMissingAlert] = useState(false);

  // Profile Form States
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');

  // Academic States
  const [department, setDepartment] = useState('CSE');
  const [passingYear, setPassingYear] = useState('2026');
  const [cgpa, setCgpa] = useState('8.5');
  const [backlogs, setBacklogs] = useState('0');

  // Skills States
  const [skillsList, setSkillsList] = useState<Array<{ skillName: string; proficiency: string }>>([]);
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillProficiency, setNewSkillProficiency] = useState('INTERMEDIATE');

  // Preferences States
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [preferredMode, setPreferredMode] = useState('ANY');
  const [preferredLocations, setPreferredLocations] = useState('Pune, Bangalore');

  // Project Form
  const [projectTitle, setProjectTitle] = useState('');
  const [projectTech, setProjectTech] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [projectUrl, setProjectUrl] = useState('');

  // Experience Form
  const [expCompany, setExpCompany] = useState('');
  const [expRole, setExpRole] = useState('');
  const [expDesc, setExpDesc] = useState('');
  const [expStart, setExpStart] = useState('');
  const [expEnd, setExpEnd] = useState('');
  const [expLocation, setExpLocation] = useState('');
  const [expCurrent, setExpCurrent] = useState(false);

  // Cert Form
  const [certName, setCertName] = useState('');
  const [certIssuer, setCertIssuer] = useState('');
  const [certDate, setCertDate] = useState('');

  // Document Upload State
  const [uploadDocType, setUploadDocType] = useState('RESUME');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // Progress Report State
  const [weekNum, setWeekNum] = useState('1');
  const [reportTasks, setReportTasks] = useState('');
  const [reportLearning, setReportLearning] = useState('');
  const [reportChallenges, setReportChallenges] = useState('');
  const [selectedInternshipForProgress, setSelectedInternshipForProgress] = useState('');

  // AI & Matching States
  const [selectedVacancyForGap, setSelectedVacancyForGap] = useState('');
  const [skillGapResult, setSkillGapResult] = useState<any>(null);
  const [resumeText, setResumeText] = useState('');
  const [resumeResult, setResumeResult] = useState<any>(null);
  const [msg, setMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Marketplace & Application Filtering States
  const [eligibleVacancies, setEligibleVacancies] = useState<any[]>([]);
  const [filterEligibleOnly, setFilterEligibleOnly] = useState(false);
  const [marketplaceSearch, setMarketplaceSearch] = useState('');
  const [marketplaceMode, setMarketplaceMode] = useState('ALL');
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);

  const domainOptions = [
    'Web Development (Full-Stack)',
    'Frontend Development',
    'Backend & Microservices',
    'AI & Machine Learning',
    'Cloud & DevOps',
    'Cybersecurity',
    'Data Science & Analytics',
    'Mobile App Development'
  ];

  const fetchStudentData = async () => {
    try {
      const pRes = await api.get('/students/me');
      if (pRes.data.success && pRes.data.data) {
        const p = pRes.data.data;
        setProfile(p);
        setFullName(p.fullName || '');
        setBio(p.bio || '');
        setPhone(p.phone || '');
        setAddress(p.address || '');
        setLinkedinUrl(p.linkedinUrl || '');
        setGithubUrl(p.githubUrl || '');
        setPortfolioUrl(p.portfolioUrl || '');
        setDepartment(p.department || 'CSE');
        setPassingYear(String(p.passingYear || 2026));
        setCgpa(String(p.cgpa || 8.0));
        setBacklogs(String(p.backlogs || 0));
        setPreferredMode(p.preferredMode || 'ANY');

        if (p.skills) {
          setSkillsList(p.skills.map((s: any) => ({
            skillName: s.skillName,
            proficiency: s.proficiency || 'INTERMEDIATE'
          })));
        }

        if (p.preferredDomains) {
          try {
            const parsed = JSON.parse(p.preferredDomains);
            setSelectedDomains(Array.isArray(parsed) ? parsed : []);
          } catch {
            setSelectedDomains(p.preferredDomains.split(',').map((s: string) => s.trim()).filter(Boolean));
          }
        }

        if (p.preferredLocations) {
          try {
            const parsed = JSON.parse(p.preferredLocations);
            setPreferredLocations(Array.isArray(parsed) ? parsed.join(', ') : p.preferredLocations);
          } catch {
            setPreferredLocations(p.preferredLocations);
          }
        }
      }

      const vRes = await api.get('/internships');
      if (vRes.data.success) {
        setVacancies(vRes.data.data);
      }

      const eRes = await api.get('/students/me/eligibility');
      if (eRes.data.success) {
        setEligibilityData(eRes.data.data.evaluations || []);
      }

      // Fetch structured eligible matching opportunities
      const evRes = await api.get(`/students/me/eligible-internships?eligibleOnly=${filterEligibleOnly}&search=${encodeURIComponent(marketplaceSearch)}&mode=${marketplaceMode}`);
      if (evRes.data.success) {
        setEligibleVacancies(evRes.data.data || []);
      }
    } catch (e) {
      console.error('Failed to load student dashboard:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentData();
  }, [filterEligibleOnly, marketplaceMode]);

  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    setMsg('');
    setSaving(true);

    try {
      const parsedLocs = preferredLocations.split(',').map(l => l.trim()).filter(Boolean);

      const res = await api.put('/students/me', {
        fullName,
        bio,
        phone,
        address,
        linkedinUrl,
        githubUrl,
        portfolioUrl,
        department,
        passingYear: parseInt(passingYear),
        cgpa: parseFloat(cgpa),
        backlogs: parseInt(backlogs),
        preferredDomains: selectedDomains,
        preferredMode,
        preferredLocations: parsedLocs,
        skills: skillsList
      });

      if (res.data.success) {
        setMsg('Profile saved successfully! Completeness updated.');
        setProfile((prev: any) => ({
          ...prev,
          ...res.data.data
        }));
      }
    } catch (e: any) {
      setErrorMsg(e.response?.data?.error?.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleAddSkill = () => {
    if (!newSkillName.trim()) return;
    if (skillsList.some(s => s.skillName.toLowerCase() === newSkillName.trim().toLowerCase())) {
      setErrorMsg('Skill already added');
      return;
    }
    const updated = [...skillsList, { skillName: newSkillName.trim(), proficiency: newSkillProficiency }];
    setSkillsList(updated);
    setNewSkillName('');
  };

  const handleRemoveSkill = (skillNameToRemove: string) => {
    setSkillsList(skillsList.filter(s => s.skillName !== skillNameToRemove));
  };

  const handleToggleDomain = (domain: string) => {
    if (selectedDomains.includes(domain)) {
      setSelectedDomains(selectedDomains.filter(d => d !== domain));
    } else {
      setSelectedDomains([...selectedDomains, domain]);
    }
  };

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectTitle.trim()) return;
    try {
      const res = await api.post('/students/me/projects', {
        title: projectTitle,
        technologies: projectTech,
        description: projectDesc,
        projectUrl: projectUrl || undefined
      });
      if (res.data.success) {
        setProjectTitle('');
        setProjectTech('');
        setProjectDesc('');
        setProjectUrl('');
        setMsg('Project added successfully!');
        fetchStudentData();
      }
    } catch (e: any) {
      setErrorMsg(e.response?.data?.error?.message || 'Failed to add project');
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      await api.delete(`/students/me/projects/${projectId}`);
      setMsg('Project removed');
      fetchStudentData();
    } catch (e: any) {
      setErrorMsg('Failed to delete project');
    }
  };

  const handleAddExperience = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expCompany.trim() || !expRole.trim()) return;
    try {
      const res = await api.post('/students/me/experience', {
        company: expCompany,
        role: expRole,
        description: expDesc,
        startDate: expStart || undefined,
        endDate: expEnd || undefined,
        isCurrent: expCurrent,
        location: expLocation || undefined
      });
      if (res.data.success) {
        setExpCompany('');
        setExpRole('');
        setExpDesc('');
        setExpStart('');
        setExpEnd('');
        setExpLocation('');
        setExpCurrent(false);
        setMsg('Work experience added!');
        fetchStudentData();
      }
    } catch (e: any) {
      setErrorMsg(e.response?.data?.error?.message || 'Failed to add experience');
    }
  };

  const handleDeleteExperience = async (expId: string) => {
    try {
      await api.delete(`/students/me/experience/${expId}`);
      setMsg('Experience removed');
      fetchStudentData();
    } catch (e: any) {
      setErrorMsg('Failed to delete experience');
    }
  };

  const handleAddCertification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!certName.trim()) return;
    try {
      const res = await api.post('/students/me/certifications', {
        name: certName,
        issuer: certIssuer,
        issueDate: certDate || undefined
      });
      if (res.data.success) {
        setCertName('');
        setCertIssuer('');
        setCertDate('');
        setMsg('Certification added!');
        fetchStudentData();
      }
    } catch (e: any) {
      setErrorMsg('Failed to add certification');
    }
  };

  const handleDeleteCertification = async (certId: string) => {
    try {
      await api.delete(`/students/me/certifications/${certId}`);
      setMsg('Certification removed');
      fetchStudentData();
    } catch (e: any) {
      setErrorMsg('Failed to delete certification');
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMsg('Please select a file to upload');
      return;
    }

    setUploadingDoc(true);
    setErrorMsg('');
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('documentType', uploadDocType);
      formData.append('entityType', 'STUDENT');

      const res = await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        setMsg(`Document "${selectedFile.name}" uploaded successfully!`);
        setSelectedFile(null);
        fetchStudentData();
      }
    } catch (e: any) {
      setErrorMsg(e.response?.data?.error?.message || 'Failed to upload document');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    try {
      await api.delete(`/documents/${docId}`);
      setMsg('Document deleted');
      fetchStudentData();
    } catch (e: any) {
      setErrorMsg('Failed to delete document');
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
      setErrorMsg(e.response?.data?.error?.message || 'Failed to submit verification');
    }
  };

  const handleApply = async (internshipId: string) => {
    setApplyingId(internshipId);
    setErrorMsg('');
    try {
      const res = await api.post(`/internships/${internshipId}/apply`);
      if (res.data.success) {
        setMsg('Application submitted successfully! Recruiter notified.');
        fetchStudentData();
      }
    } catch (e: any) {
      const err = e.response?.data?.error;
      const detailMsg = err?.details ? `: ${err.details.join(', ')}` : '';
      setErrorMsg(`${err?.message || 'Application failed'}${detailMsg}`);
    } finally {
      setApplyingId(null);
    }
  };

  const handleWithdrawApplication = async (applicationId: string) => {
    if (!window.confirm('Are you sure you want to withdraw this application?')) return;
    setWithdrawingId(applicationId);
    setErrorMsg('');
    try {
      const res = await api.post(`/applications/${applicationId}/withdraw`);
      if (res.data.success) {
        setMsg('Application withdrawn successfully');
        fetchStudentData();
      }
    } catch (e: any) {
      setErrorMsg(e.response?.data?.error?.message || 'Failed to withdraw application');
    } finally {
      setWithdrawingId(null);
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
      setErrorMsg('Failed to respond to offer');
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
      setErrorMsg(e.response?.data?.error?.message || 'Failed to submit report');
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
    return (
      <div className="min-h-[400px] flex items-center justify-center text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  const completeness = profile?.completeness || { completenessScore: 0, breakdown: {}, missingSections: [], recommendations: [] };
  const completenessScore = completeness.completenessScore || 0;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      {/* AUTHORITATIVE PROFILE HEADER & COMPLETENESS BANNER */}
      <div className="glass-card p-6 border-slate-800 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white text-xl font-black shadow-lg shadow-cyan-500/20">
              {profile?.fullName ? profile.fullName.charAt(0).toUpperCase() : 'S'}
            </div>
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-2xl font-bold text-white">{profile?.fullName || 'Student Workspace'}</h1>
                <StatusBadge status={profile?.profileStatus || 'DRAFT'} />
              </div>
              <p className="text-xs text-slate-400 mt-1">
                ID: <span className="text-cyan-300 font-mono font-semibold">{profile?.studentCode}</span> &bull; {profile?.department} ({profile?.passingYear}) &bull; CGPA: <strong className="text-white">{profile?.cgpa}</strong> &bull; Backlogs: <strong className="text-white">{profile?.backlogs}</strong>
              </p>
            </div>
          </div>

          {/* Completeness Gauge */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-slate-900/90 p-4 rounded-2xl border border-slate-800">
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  Backend Profile Completeness
                </span>
                <span className={`font-black text-sm ${completenessScore >= 80 ? 'text-emerald-400' : 'text-cyan-400'}`}>
                  {completenessScore}%
                </span>
              </div>
              {/* Progress Track */}
              <div className="w-56 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-700 ${
                    completenessScore >= 80
                      ? 'bg-emerald-500'
                      : completenessScore >= 50
                      ? 'bg-cyan-500'
                      : 'bg-amber-500'
                  }`}
                  style={{ width: `${completenessScore}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                {completenessScore >= 80 ? '✅ Ready for T&P Placement Drives' : '⚠️ Complete profile to unlock applications'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowMissingAlert(!showMissingAlert)}
                className="text-xs px-3 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition-colors"
              >
                {showMissingAlert ? 'Hide Checklist' : 'Checklist'}
              </button>

              {profile?.profileStatus !== 'VERIFIED' && (
                <button
                  onClick={handleSubmitProfileVerification}
                  className="btn-primary text-xs py-2 px-3.5 flex items-center space-x-1.5 whitespace-nowrap"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Submit to T&P</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Completeness Criteria Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 pt-2 border-t border-slate-200 text-[11px]">
          <div className={`p-2 rounded-xl border flex items-center space-x-1.5 font-semibold ${
            completeness.breakdown?.personal?.completed ? 'bg-emerald-100 border-emerald-300 text-slate-900' : 'bg-slate-100 border-slate-200 text-slate-700'
          }`}>
            {completeness.breakdown?.personal?.completed ? <Check className="w-3.5 h-3.5 text-emerald-700 font-bold" /> : <AlertCircle className="w-3.5 h-3.5 text-amber-600" />}
            <span>Personal (20%)</span>
          </div>

          <div className={`p-2 rounded-xl border flex items-center space-x-1.5 font-semibold ${
            completeness.breakdown?.academic?.completed ? 'bg-emerald-100 border-emerald-300 text-slate-900' : 'bg-slate-100 border-slate-200 text-slate-700'
          }`}>
            {completeness.breakdown?.academic?.completed ? <Check className="w-3.5 h-3.5 text-emerald-700 font-bold" /> : <AlertCircle className="w-3.5 h-3.5 text-amber-600" />}
            <span>Academic (20%)</span>
          </div>

          <div className={`p-2 rounded-xl border flex items-center space-x-1.5 font-semibold ${
            completeness.breakdown?.skills?.completed ? 'bg-emerald-100 border-emerald-300 text-slate-900' : 'bg-slate-100 border-slate-200 text-slate-700'
          }`}>
            {completeness.breakdown?.skills?.completed ? <Check className="w-3.5 h-3.5 text-emerald-700 font-bold" /> : <AlertCircle className="w-3.5 h-3.5 text-amber-600" />}
            <span>Skills (15%)</span>
          </div>

          <div className={`p-2 rounded-xl border flex items-center space-x-1.5 font-semibold ${
            completeness.breakdown?.projectsAndExperience?.completed ? 'bg-emerald-100 border-emerald-300 text-slate-900' : 'bg-slate-100 border-slate-200 text-slate-700'
          }`}>
            {completeness.breakdown?.projectsAndExperience?.completed ? <Check className="w-3.5 h-3.5 text-emerald-700 font-bold" /> : <AlertCircle className="w-3.5 h-3.5 text-amber-600" />}
            <span>Projects & Exp (15%)</span>
          </div>

          <div className={`p-2 rounded-xl border flex items-center space-x-1.5 font-semibold ${
            completeness.breakdown?.resume?.completed ? 'bg-emerald-100 border-emerald-300 text-slate-900' : 'bg-slate-100 border-slate-200 text-slate-700'
          }`}>
            {completeness.breakdown?.resume?.completed ? <Check className="w-3.5 h-3.5 text-emerald-700 font-bold" /> : <AlertCircle className="w-3.5 h-3.5 text-amber-600" />}
            <span>Resume (15%)</span>
          </div>

          <div className={`p-2 rounded-xl border flex items-center space-x-1.5 font-semibold ${
            completeness.breakdown?.documents?.completed ? 'bg-emerald-100 border-emerald-300 text-slate-900' : 'bg-slate-100 border-slate-200 text-slate-700'
          }`}>
            {completeness.breakdown?.documents?.completed ? <Check className="w-3.5 h-3.5 text-emerald-700 font-bold" /> : <AlertCircle className="w-3.5 h-3.5 text-amber-600" />}
            <span>Documents (10%)</span>
          </div>

          <div className={`p-2 rounded-xl border flex items-center space-x-1.5 font-semibold ${
            completeness.breakdown?.preferences?.completed ? 'bg-emerald-100 border-emerald-300 text-slate-900' : 'bg-slate-100 border-slate-200 text-slate-700'
          }`}>
            {completeness.breakdown?.preferences?.completed ? <Check className="w-3.5 h-3.5 text-emerald-700 font-bold" /> : <AlertCircle className="w-3.5 h-3.5 text-amber-600" />}
            <span>Preferences (5%)</span>
          </div>
        </div>


        {/* Missing Checklist Dropdown Panel */}
        {showMissingAlert && (
          <div className="p-4 bg-slate-900/90 rounded-xl border border-cyan-500/30 space-y-2 text-xs">
            <h4 className="font-bold text-cyan-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              Authoritative Profile Recommendations:
            </h4>
            {completeness.recommendations?.length > 0 ? (
              <ul className="list-disc list-inside space-y-1 text-slate-300">
                {completeness.recommendations.map((rec: string, idx: number) => (
                  <li key={idx}>{rec}</li>
                ))}
              </ul>
            ) : (
              <p className="text-emerald-400 font-semibold">🎉 All profile completeness sections are fully satisfied!</p>
            )}
          </div>
        )}
      </div>

      {/* Global Alerts */}
      {msg && (
        <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs rounded-xl flex items-center justify-between">
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

      {/* TOP-LEVEL TABS */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-2 text-xs">
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2 rounded-xl font-semibold transition-all ${
            activeTab === 'profile' ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20' : 'text-slate-400 hover:text-white bg-slate-900'
          }`}
        >
          👤 My Profile & Documents
        </button>
        <button
          onClick={() => setActiveTab('marketplace')}
          className={`px-4 py-2 rounded-xl font-semibold transition-all ${
            activeTab === 'marketplace' ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20' : 'text-slate-400 hover:text-white bg-slate-900'
          }`}
        >
          🔍 Internship Discovery ({vacancies.length})
        </button>
        <button
          onClick={() => setActiveTab('applications')}
          className={`px-4 py-2 rounded-xl font-semibold transition-all ${
            activeTab === 'applications' ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20' : 'text-slate-400 hover:text-white bg-slate-900'
          }`}
        >
          📄 My Applications ({profile?.applications?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('progress')}
          className={`px-4 py-2 rounded-xl font-semibold transition-all ${
            activeTab === 'progress' ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20' : 'text-slate-400 hover:text-white bg-slate-900'
          }`}
        >
          📊 Weekly Progress Reports
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

      {/* ======================================================== */}
      {/* TAB: COMPREHENSIVE PROFILE & DOCUMENT MANAGEMENT */}
      {/* ======================================================== */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          {/* Sub-Navigation */}
          <div className="flex flex-wrap gap-1.5 p-1 bg-slate-900/90 rounded-2xl border border-slate-800 text-xs">
            <button
              onClick={() => setProfileTab('personal')}
              className={`px-3.5 py-2 rounded-xl font-semibold transition-all ${
                profileTab === 'personal' ? 'bg-cyan-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Personal Info
            </button>
            <button
              onClick={() => setProfileTab('academic')}
              className={`px-3.5 py-2 rounded-xl font-semibold transition-all ${
                profileTab === 'academic' ? 'bg-cyan-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Academics
            </button>
            <button
              onClick={() => setProfileTab('skills')}
              className={`px-3.5 py-2 rounded-xl font-semibold transition-all ${
                profileTab === 'skills' ? 'bg-cyan-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Skills ({skillsList.length})
            </button>
            <button
              onClick={() => setProfileTab('projects')}
              className={`px-3.5 py-2 rounded-xl font-semibold transition-all ${
                profileTab === 'projects' ? 'bg-cyan-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Projects ({profile?.projects?.length || 0})
            </button>
            <button
              onClick={() => setProfileTab('experience')}
              className={`px-3.5 py-2 rounded-xl font-semibold transition-all ${
                profileTab === 'experience' ? 'bg-cyan-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Experience ({profile?.experiences?.length || 0})
            </button>
            <button
              onClick={() => setProfileTab('certifications')}
              className={`px-3.5 py-2 rounded-xl font-semibold transition-all ${
                profileTab === 'certifications' ? 'bg-cyan-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Certifications ({profile?.certifications?.length || 0})
            </button>
            <button
              onClick={() => setProfileTab('preferences')}
              className={`px-3.5 py-2 rounded-xl font-semibold transition-all ${
                profileTab === 'preferences' ? 'bg-cyan-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Preferences
            </button>
            <button
              onClick={() => setProfileTab('documents')}
              className={`px-3.5 py-2 rounded-xl font-semibold transition-all ${
                profileTab === 'documents' ? 'bg-cyan-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              📁 Documents & Resume ({profile?.documents?.length || 0})
            </button>
          </div>

          {/* 1. PERSONAL INFORMATION */}
          {profileTab === 'personal' && (
            <div className="glass-card p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">Personal & Contact Information</h3>
                  <p className="text-xs text-slate-400">Keep your personal background and contact details updated for recruiters.</p>
                </div>
                <button
                  onClick={() => handleSaveProfile()}
                  disabled={saving}
                  className="btn-primary text-xs py-2 px-4"
                >
                  {saving ? 'Saving...' : 'Save Personal Details'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Full Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl pl-9 pr-3 py-2.5"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Contact Phone Number</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. +91 9876543210"
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl pl-9 pr-3 py-2.5"
                    />
                  </div>
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-slate-300 font-semibold">Professional Summary / Bio</label>
                  <textarea
                    rows={3}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell recruiters about your background, career objectives, and technical passion..."
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-3"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Current Location / Address</label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="e.g. Pune, Maharashtra"
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl pl-9 pr-3 py-2.5"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">LinkedIn Profile URL</label>
                  <div className="relative">
                    <Linkedin className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="url"
                      value={linkedinUrl}
                      onChange={(e) => setLinkedinUrl(e.target.value)}
                      placeholder="https://linkedin.com/in/username"
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl pl-9 pr-3 py-2.5"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">GitHub Profile URL</label>
                  <div className="relative">
                    <Github className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="url"
                      value={githubUrl}
                      onChange={(e) => setGithubUrl(e.target.value)}
                      placeholder="https://github.com/username"
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl pl-9 pr-3 py-2.5"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Portfolio / Personal Website</label>
                  <div className="relative">
                    <Globe className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="url"
                      value={portfolioUrl}
                      onChange={(e) => setPortfolioUrl(e.target.value)}
                      placeholder="https://yourportfolio.dev"
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl pl-9 pr-3 py-2.5"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. ACADEMIC INFORMATION */}
          {profileTab === 'academic' && (
            <div className="glass-card p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">Academic Details</h3>
                  <p className="text-xs text-slate-400">Deterministic criteria used for automated placement eligibility evaluation.</p>
                </div>
                <button
                  onClick={() => handleSaveProfile()}
                  disabled={saving}
                  className="btn-primary text-xs py-2 px-4"
                >
                  {saving ? 'Saving...' : 'Save Academic Details'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Department / Engineering Branch</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-2.5"
                  >
                    <option value="CSE">Computer Science and Engineering (CSE)</option>
                    <option value="IT">Information Technology (IT)</option>
                    <option value="AI_DS">AI & Data Science (AI/DS)</option>
                    <option value="ECE">Electronics and Communication (ECE)</option>
                    <option value="EE">Electrical Engineering (EE)</option>
                    <option value="MECH">Mechanical Engineering (MECH)</option>
                    <option value="CIVIL">Civil Engineering (CIVIL)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Graduation / Passing Year</label>
                  <input
                    type="number"
                    value={passingYear}
                    onChange={(e) => setPassingYear(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-2.5"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Cumulative CGPA (0.00 - 10.00)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    value={cgpa}
                    onChange={(e) => setCgpa(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-2.5 font-bold text-cyan-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Active Backlogs Count</label>
                  <input
                    type="number"
                    min="0"
                    value={backlogs}
                    onChange={(e) => setBacklogs(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-2.5 font-bold text-amber-400"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 3. SKILLS */}
          {profileTab === 'skills' && (
            <div className="glass-card p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">Technical Skills & Proficiencies</h3>
                  <p className="text-xs text-slate-400">Add technical proficiencies for automated AI candidate matching.</p>
                </div>
                <button
                  onClick={() => handleSaveProfile()}
                  disabled={saving}
                  className="btn-primary text-xs py-2 px-4"
                >
                  {saving ? 'Saving...' : 'Save Skills'}
                </button>
              </div>

              {/* Add Skill Bar */}
              <div className="flex flex-col sm:flex-row gap-2 bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-xs">
                <input
                  type="text"
                  placeholder="Skill Name (e.g. TypeScript, React, Docker, Spring Boot)"
                  value={newSkillName}
                  onChange={(e) => setNewSkillName(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-700 text-white rounded-lg px-3 py-2"
                />
                <select
                  value={newSkillProficiency}
                  onChange={(e) => setNewSkillProficiency(e.target.value)}
                  className="bg-slate-950 border border-slate-700 text-white rounded-lg px-3 py-2"
                >
                  <option value="BEGINNER">Beginner</option>
                  <option value="INTERMEDIATE">Intermediate</option>
                  <option value="ADVANCED">Advanced</option>
                </select>
                <button
                  type="button"
                  onClick={handleAddSkill}
                  className="btn-secondary text-xs py-2 px-4 flex items-center justify-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Skill</span>
                </button>
              </div>

              {/* Skills Grid */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-400">Your Current Skills ({skillsList.length}):</span>
                {skillsList.length === 0 ? (
                  <p className="text-xs text-slate-500">No skills added yet. Add at least 3 skills to maximize match score.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {skillsList.map((sk, idx) => (
                      <div
                        key={idx}
                        className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs"
                      >
                        <span className="font-semibold text-white">{sk.skillName}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                          sk.proficiency === 'ADVANCED' ? 'bg-indigo-500/20 text-indigo-300' :
                          sk.proficiency === 'INTERMEDIATE' ? 'bg-cyan-500/20 text-cyan-300' :
                          'bg-slate-800 text-slate-400'
                        }`}>
                          {sk.proficiency}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSkill(sk.skillName)}
                          className="text-slate-500 hover:text-rose-400 transition-colors"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 4. PROJECTS */}
          {profileTab === 'projects' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Add Project Form */}
              <div className="glass-card p-6 space-y-4">
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <Plus className="w-4 h-4 text-cyan-400" />
                  <span>Add Technical Project</span>
                </h3>
                <form onSubmit={handleAddProject} className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <label className="text-slate-300 font-semibold">Project Title</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Distributed Task Queue"
                      value={projectTitle}
                      onChange={(e) => setProjectTitle(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-2.5"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-300 font-semibold">Technologies Used</label>
                    <input
                      type="text"
                      placeholder="e.g. React, Node.js, Redis, Docker"
                      value={projectTech}
                      onChange={(e) => setProjectTech(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-2.5"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-300 font-semibold">Project / GitHub URL</label>
                    <input
                      type="url"
                      placeholder="https://github.com/username/project"
                      value={projectUrl}
                      onChange={(e) => setProjectUrl(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-2.5"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-300 font-semibold">Description</label>
                    <textarea
                      rows={3}
                      placeholder="Explain the problem solved, architecture, and impact..."
                      value={projectDesc}
                      onChange={(e) => setProjectDesc(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-2.5"
                    />
                  </div>

                  <button type="submit" className="w-full btn-primary text-xs py-2.5">
                    Save Project
                  </button>
                </form>
              </div>

              {/* Projects List */}
              <div className="lg:col-span-2 glass-card p-6 space-y-4">
                <h3 className="text-base font-bold text-white">Your Showcase Projects ({profile?.projects?.length || 0})</h3>
                {(!profile?.projects || profile.projects.length === 0) ? (
                  <p className="text-xs text-slate-400">No projects added yet. Add at least 1 project to prove your hands-on coding skills.</p>
                ) : (
                  <div className="space-y-3">
                    {profile.projects.map((proj: any) => (
                      <div key={proj.id} className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2 text-xs">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-bold text-white text-sm">{proj.title}</h4>
                            <p className="text-cyan-400 text-[11px] mt-0.5">{proj.technologies}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            {proj.projectUrl && (
                              <a
                                href={proj.projectUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-slate-400 hover:text-cyan-300 p-1"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}
                            <button
                              onClick={() => handleDeleteProject(proj.id)}
                              className="text-slate-500 hover:text-rose-400 p-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <p className="text-slate-300 leading-relaxed">{proj.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 5. WORK & INTERNSHIP EXPERIENCE */}
          {profileTab === 'experience' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Add Experience Form */}
              <div className="glass-card p-6 space-y-4">
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <Briefcase className="w-4 h-4 text-cyan-400" />
                  <span>Add Experience</span>
                </h3>
                <form onSubmit={handleAddExperience} className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <label className="text-slate-300 font-semibold">Company / Organization</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Acme Tech"
                      value={expCompany}
                      onChange={(e) => setExpCompany(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-2.5"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-300 font-semibold">Role Title</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Frontend Developer Intern"
                      value={expRole}
                      onChange={(e) => setExpRole(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-2.5"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-slate-300 font-semibold">Start Date</label>
                      <input
                        type="date"
                        value={expStart}
                        onChange={(e) => setExpStart(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-2.5"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-300 font-semibold">End Date</label>
                      <input
                        type="date"
                        disabled={expCurrent}
                        value={expEnd}
                        onChange={(e) => setExpEnd(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-2.5 disabled:opacity-40"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 pt-1">
                    <input
                      type="checkbox"
                      id="expCurrentCheck"
                      checked={expCurrent}
                      onChange={(e) => setExpCurrent(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-0"
                    />
                    <label htmlFor="expCurrentCheck" className="text-slate-300 cursor-pointer">Currently working here</label>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-300 font-semibold">Location</label>
                    <input
                      type="text"
                      placeholder="e.g. Remote / Pune"
                      value={expLocation}
                      onChange={(e) => setExpLocation(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-2.5"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-300 font-semibold">Responsibilities & Learnings</label>
                    <textarea
                      rows={3}
                      placeholder="Key achievements and technologies utilized..."
                      value={expDesc}
                      onChange={(e) => setExpDesc(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-2.5"
                    />
                  </div>

                  <button type="submit" className="w-full btn-primary text-xs py-2.5">
                    Save Experience
                  </button>
                </form>
              </div>

              {/* Experience List */}
              <div className="lg:col-span-2 glass-card p-6 space-y-4">
                <h3 className="text-base font-bold text-white">Work Experience History ({profile?.experiences?.length || 0})</h3>
                {(!profile?.experiences || profile.experiences.length === 0) ? (
                  <p className="text-xs text-slate-400">No work experiences recorded yet. Add prior internships or freelance roles.</p>
                ) : (
                  <div className="space-y-3">
                    {profile.experiences.map((exp: any) => (
                      <div key={exp.id} className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2 text-xs">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-bold text-white text-sm">{exp.role}</h4>
                            <p className="text-cyan-400 text-xs font-semibold">{exp.company} &bull; <span className="text-slate-400 font-normal">{exp.location || 'Remote'}</span></p>
                            <span className="text-[11px] text-slate-500">
                              {exp.startDate || 'N/A'} &rarr; {exp.isCurrent ? 'Present' : (exp.endDate || 'N/A')}
                            </span>
                          </div>
                          <button
                            onClick={() => handleDeleteExperience(exp.id)}
                            className="text-slate-500 hover:text-rose-400 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        {exp.description && <p className="text-slate-300 leading-relaxed pt-1">{exp.description}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 6. CERTIFICATIONS */}
          {profileTab === 'certifications' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Add Cert Form */}
              <div className="glass-card p-6 space-y-4">
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <Award className="w-4 h-4 text-cyan-400" />
                  <span>Add Certification</span>
                </h3>
                <form onSubmit={handleAddCertification} className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <label className="text-slate-300 font-semibold">Certification Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. AWS Certified Cloud Practitioner"
                      value={certName}
                      onChange={(e) => setCertName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-2.5"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-300 font-semibold">Issuer / Organization</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Amazon Web Services, Coursera, Oracle"
                      value={certIssuer}
                      onChange={(e) => setCertIssuer(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-2.5"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-300 font-semibold">Issue Date</label>
                    <input
                      type="date"
                      value={certDate}
                      onChange={(e) => setCertDate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-2.5"
                    />
                  </div>

                  <button type="submit" className="w-full btn-primary text-xs py-2.5">
                    Save Certification
                  </button>
                </form>
              </div>

              {/* Certifications List */}
              <div className="lg:col-span-2 glass-card p-6 space-y-4">
                <h3 className="text-base font-bold text-white">Verified Certifications ({profile?.certifications?.length || 0})</h3>
                {(!profile?.certifications || profile.certifications.length === 0) ? (
                  <p className="text-xs text-slate-400">No certifications recorded. Add your verified online or industry credentials.</p>
                ) : (
                  <div className="space-y-3">
                    {profile.certifications.map((c: any) => (
                      <div key={c.id} className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1 text-xs flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-white text-sm">{c.name}</h4>
                          <p className="text-slate-400 text-xs">{c.issuer} &bull; Issued: {c.issueDate || 'N/A'}</p>
                        </div>
                        <button
                          onClick={() => handleDeleteCertification(c.id)}
                          className="text-slate-500 hover:text-rose-400 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 7. PREFERENCES */}
          {profileTab === 'preferences' && (
            <div className="glass-card p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">Internship & Career Preferences</h3>
                  <p className="text-xs text-slate-400">Configure your target domains, work mode, and preferred cities for customized vacancy recommendations.</p>
                </div>
                <button
                  onClick={() => handleSaveProfile()}
                  disabled={saving}
                  className="btn-primary text-xs py-2 px-4"
                >
                  {saving ? 'Saving...' : 'Save Preferences'}
                </button>
              </div>

              <div className="space-y-4 text-xs">
                {/* Domain Selector */}
                <div className="space-y-2">
                  <label className="text-slate-300 font-semibold block">Preferred Internship Domains:</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                    {domainOptions.map((dom) => {
                      const isSelected = selectedDomains.includes(dom);
                      return (
                        <button
                          type="button"
                          key={dom}
                          onClick={() => handleToggleDomain(dom)}
                          className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                            isSelected
                              ? 'bg-cyan-500/20 border-cyan-500 text-white font-semibold'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          <span>{dom}</span>
                          {isSelected && <Check className="w-4 h-4 text-cyan-400" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Internship Mode */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1">
                    <label className="text-slate-300 font-semibold">Preferred Working Mode</label>
                    <select
                      value={preferredMode}
                      onChange={(e) => setPreferredMode(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-2.5"
                    >
                      <option value="ANY">Any / Flexible Mode</option>
                      <option value="REMOTE">Remote Only</option>
                      <option value="HYBRID">Hybrid (Office + Remote)</option>
                      <option value="ON_SITE">On-Site Office</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-300 font-semibold">Preferred Locations (Comma separated)</label>
                    <input
                      type="text"
                      placeholder="e.g. Pune, Bangalore, Mumbai, Remote"
                      value={preferredLocations}
                      onChange={(e) => setPreferredLocations(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-2.5"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 8. RESUME & SECURE OBJECT DOCUMENTS LOCKER */}
          {profileTab === 'documents' && (
            <div className="space-y-6">
              {/* Active Resume Card */}
              <div className="glass-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-cyan-500/30">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">Active Resume Attachment</span>
                    <h4 className="text-base font-bold text-white">
                      {profile?.resumeDocument ? profile.resumeDocument.originalName : 'No Active Resume Uploaded'}
                    </h4>
                    <p className="text-xs text-slate-400">
                      {profile?.resumeDocument
                        ? `Uploaded: ${new Date(profile.resumeDocument.uploadedAt).toLocaleDateString()} &bull; ${(profile.resumeDocument.size / 1024).toFixed(1)} KB`
                        : 'Upload a PDF resume to complete the 15% Resume completeness requirement.'}
                    </p>
                  </div>
                </div>

                {profile?.resumeDocument && (
                  <div className="flex items-center space-x-2">
                    <a
                      href={`http://localhost:5000/api/v1/documents/${profile.resumeDocument.id}/file`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-primary text-xs py-2 px-3.5 flex items-center space-x-1.5"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download Resume</span>
                    </a>
                  </div>
                )}
              </div>

              {/* Upload New Document Card */}
              <div className="glass-card p-6 space-y-4">
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <UploadCloud className="w-5 h-5 text-cyan-400" />
                  <span>Secure Document Upload</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Files are stored in secure object storage with strict role access controls. Only you and authorized T&P / Mentors can view your documents.
                </p>

                <form onSubmit={handleFileUpload} className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs items-end">
                  <div className="space-y-1">
                    <label className="text-slate-300 font-semibold">Document Category</label>
                    <select
                      value={uploadDocType}
                      onChange={(e) => setUploadDocType(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-2.5"
                    >
                      <option value="RESUME">Official Resume (PDF)</option>
                      <option value="COLLEGE_ID">College Student ID Card</option>
                      <option value="ACADEMIC_RECORD">Academic Marksheet / Transcript</option>
                      <option value="CERTIFICATION">Course / Experience Certificate</option>
                      <option value="OTHER">Other Proof Document</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-300 font-semibold">Select File (PDF, PNG, JPG &le; 10MB)</label>
                    <input
                      type="file"
                      accept=".pdf,image/png,image/jpeg,image/webp"
                      onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)}
                      className="w-full bg-slate-900 border border-slate-700 text-slate-300 rounded-xl p-2 file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-cyan-500 file:text-white hover:file:bg-cyan-400"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={uploadingDoc || !selectedFile}
                    className="btn-primary text-xs py-2.5 px-4 h-[38px] flex items-center justify-center space-x-1.5"
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>{uploadingDoc ? 'Uploading...' : 'Upload Document'}</span>
                  </button>
                </form>
              </div>

              {/* Uploaded Documents List */}
              <div className="glass-card p-6 space-y-4">
                <h3 className="text-base font-bold text-white">Stored Documents ({profile?.documents?.length || 0})</h3>
                {(!profile?.documents || profile.documents.length === 0) ? (
                  <p className="text-xs text-slate-400">No documents stored in vault yet.</p>
                ) : (
                  <div className="space-y-2">
                    {profile.documents.map((doc: any) => (
                      <div
                        key={doc.id}
                        className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                      >
                        <div className="flex items-center space-x-3">
                          <FileText className="w-5 h-5 text-slate-400 shrink-0" />
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-white">{doc.originalName}</span>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-400 border border-slate-700">
                                {doc.documentType}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {(doc.size / 1024).toFixed(1)} KB &bull; Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <a
                            href={`http://localhost:5000/api/v1/documents/${doc.id}/file`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 px-3 py-1.5 rounded-lg flex items-center space-x-1"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download</span>
                          </a>
                          <button
                            onClick={() => handleDeleteDocument(doc.id)}
                            className="text-slate-500 hover:text-rose-400 p-1.5"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: INTERNSHIP MARKETPLACE & ELIGIBLE MATCHING */}
      {/* ======================================================== */}
      {activeTab === 'marketplace' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="glass-card p-4 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search by role, skills, company..."
                  value={marketplaceSearch}
                  onChange={(e) => setMarketplaceSearch(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') fetchStudentData(); }}
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl pl-9 pr-3 py-2"
                />
              </div>
              <button
                onClick={() => fetchStudentData()}
                className="btn-secondary py-2 px-3 text-xs"
              >
                Search
              </button>
            </div>

            <div className="flex items-center space-x-2 w-full md:w-auto justify-end">
              <select
                value={marketplaceMode}
                onChange={(e) => setMarketplaceMode(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs"
              >
                <option value="ALL">All Modes</option>
                <option value="REMOTE">Remote</option>
                <option value="HYBRID">Hybrid</option>
                <option value="ON_SITE">On-Site</option>
              </select>

              <button
                type="button"
                onClick={() => setFilterEligibleOnly(!filterEligibleOnly)}
                className={`px-3.5 py-2 rounded-xl border flex items-center space-x-1.5 transition-all text-xs font-semibold ${
                  filterEligibleOnly
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-500/10'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Show Eligible Only</span>
              </button>
            </div>
          </div>

          {/* Vacancy Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {eligibleVacancies.length === 0 ? (
              <div className="md:col-span-2 glass-card p-12 text-center space-y-3">
                <Briefcase className="w-10 h-10 text-slate-600 mx-auto" />
                <h4 className="text-base font-bold text-white">No Matching Vacancies Found</h4>
                <p className="text-xs text-slate-400">Try adjusting your search filters or toggling the eligible-only filter.</p>
              </div>
            ) : (
              eligibleVacancies.map((item) => {
                const v = item.internship;
                const eligibility = item.eligibility;
                const match = item.match;
                const hasApplied = item.hasApplied;
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

                      <div className="grid grid-cols-3 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                        <div><span className="text-slate-500 block text-[10px] font-semibold uppercase">Stipend</span> <span className="text-slate-900 font-semibold">₹{v.stipend?.toLocaleString()}/mo</span></div>
                        <div><span className="text-slate-500 block text-[10px] font-semibold uppercase">Duration</span> <span className="text-slate-900 font-semibold">{v.durationMonths} Mos</span></div>
                        <div><span className="text-slate-500 block text-[10px] font-semibold uppercase">Location</span> <span className="text-slate-900 font-semibold">{v.location || 'Flexible'}</span></div>
                      </div>

                      {/* Required Skills */}
                      <div className="flex flex-wrap gap-1.5">
                        {reqSkills.map((sk: string, idx: number) => (
                          <span key={idx} className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                            {sk}
                          </span>
                        ))}
                      </div>

                      {/* Deterministic Hard Eligibility Card */}
                      {eligibility && (
                        <EligibilityCard result={eligibility} />
                      )}

                      {/* Explainable Match Score Badge */}
                      {match && item.isEligible && (
                        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 flex items-center space-x-1">
                              <Sparkles className="w-3.5 h-3.5 text-[#66A3BF]" />
                              <span>AI Match Score: {match.matchScore}%</span>
                            </span>
                            <span className="text-[10px] text-slate-700 font-semibold">
                              Skills: {match.factors?.skillMatch}% | Domain: {match.factors?.domainMatch}%
                            </span>
                          </div>
                          {match.explanation && (
                            <p className="text-[11px] text-slate-700 leading-snug">{match.explanation}</p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500">Deadline: {v.deadline || 'Open'}</span>
                      {hasApplied ? (
                        <span className="text-xs font-semibold text-emerald-400 flex items-center space-x-1">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Applied</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => handleApply(v.id)}
                          disabled={!item.isEligible || applyingId === v.id}
                          className={`text-xs py-2 px-4 rounded-xl font-semibold transition-all ${
                            !item.isEligible
                              ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                              : 'btn-primary'
                          }`}
                        >
                          {applyingId === v.id ? 'Submitting...' : (item.isEligible ? 'Apply Now' : 'Ineligible')}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: MY APPLICATIONS & OFFER RESPONSES */}
      {/* ======================================================== */}
      {activeTab === 'applications' && (
        <div className="space-y-4">
          <div className="glass-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Application Tracking & Offers</h3>
                <p className="text-xs text-slate-400">Track your submitted applications, match scores, recruiter reviews, and formal offer letters.</p>
              </div>
              <span className="text-xs text-slate-400 font-semibold bg-slate-800 px-3 py-1.5 rounded-lg">
                {profile?.applications?.length || 0} Applications
              </span>
            </div>

            {(!profile?.applications || profile.applications.length === 0) ? (
              <div className="p-8 text-center space-y-2">
                <FileText className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400">You haven't submitted any applications yet. Explore the Marketplace tab to find eligible opportunities.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {profile.applications.map((app: any) => (
                  <div key={app.id} className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-white text-sm">{app.internship?.title}</h4>
                        <p className="text-xs text-slate-400">{app.internship?.company?.name} &bull; Applied: {new Date(app.appliedAt || app.createdAt).toLocaleDateString()}</p>
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

                    {/* Actions Row: Withdraw Button */}
                    {['APPLIED', 'UNDER_REVIEW'].includes(app.status) && (
                      <div className="flex justify-end pt-1">
                        <button
                          onClick={() => handleWithdrawApplication(app.id)}
                          disabled={withdrawingId === app.id}
                          className="text-xs text-rose-400 hover:text-rose-300 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-lg transition-all"
                        >
                          {withdrawingId === app.id ? 'Withdrawing...' : 'Withdraw Application'}
                        </button>
                      </div>
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

      {/* ======================================================== */}
      {/* TAB 4: WEEKLY PROGRESS REPORTS */}
      {/* ======================================================== */}
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

      {/* ======================================================== */}
      {/* TAB 5: AI SKILL-GAP ANALYZER */}
      {/* ======================================================== */}
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

      {/* ======================================================== */}
      {/* TAB 6: AI RESUME ANALYZER */}
      {/* ======================================================== */}
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
