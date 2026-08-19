import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import {
  Building2, Plus, Users, Award, FileText, CheckCircle2, XCircle, Sparkles, Send,
  Edit, Trash2, PauseCircle, PlayCircle, StopCircle, Globe, MapPin, Phone, Mail,
  Search, Filter, Briefcase
} from 'lucide-react';

export const CompanyDashboard: React.FC = () => {
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'vacancies' | 'profile' | 'applicants' | 'evaluations' | 'ppo'>('vacancies');
  const [vacancyFilter, setVacancyFilter] = useState<string>('ALL');
  const [vacancySearch, setVacancySearch] = useState<string>('');

  const [selectedVacancy, setSelectedVacancy] = useState<any>(null);
  const [applicants, setApplicants] = useState<any[]>([]);

  // Profile Form State
  const [profileName, setProfileName] = useState('');
  const [profileIndustry, setProfileIndustry] = useState('');
  const [profileWebsite, setProfileWebsite] = useState('');
  const [profileLocation, setProfileLocation] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileContactName, setProfileContactName] = useState('');
  const [profileContactEmail, setProfileContactEmail] = useState('');
  const [profileDescription, setProfileDescription] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Vacancy Modal State
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editVacancyId, setEditVacancyId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [durationMonths, setDurationMonths] = useState('6');
  const [mode, setMode] = useState('HYBRID');
  const [location, setLocation] = useState('Pune / Remote');
  const [stipend, setStipend] = useState('25000');
  const [vacanciesCount, setVacanciesCount] = useState('3');
  const [minCgpa, setMinCgpa] = useState('7.0');
  const [maxBacklogs, setMaxBacklogs] = useState('0');
  const [branches, setBranches] = useState('CSE, IT');
  const [skills, setSkills] = useState('Java, SQL, Spring Boot');
  const [responsibilities, setResponsibilities] = useState('');
  const [requirements, setRequirements] = useState('');
  const [deadline, setDeadline] = useState('');

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

  // Offer Modal State
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerAppId, setOfferAppId] = useState<string | null>(null);
  const [offerCandidateName, setOfferCandidateName] = useState('');
  const [offerRole, setOfferRole] = useState('');
  const [offerStartDate, setOfferStartDate] = useState('');
  const [offerEndDate, setOfferEndDate] = useState('');
  const [offerStipend, setOfferStipend] = useState('25000');
  const [offerLocation, setOfferLocation] = useState('Pune Tech Center');
  const [offerTerms, setOfferTerms] = useState('Standard 40 hours per week internship. IP rights assigned to company.');
  const [offerDeadline, setOfferDeadline] = useState('');
  const [issuingOffer, setIssuingOffer] = useState(false);

  const [msg, setMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const fetchCompanyData = async () => {
    try {
      const res = await api.get('/companies/me');
      if (res.data.success) {
        const c = res.data.data;
        setCompany(c);
        setProfileName(c.name || '');
        setProfileIndustry(c.industry || '');
        setProfileWebsite(c.website || '');
        setProfileLocation(c.location || '');
        setProfilePhone(c.phone || '');
        setProfileContactName(c.contactName || '');
        setProfileContactEmail(c.contactEmail || '');
        setProfileDescription(c.description || '');

        if (c.internships?.length > 0) {
          const firstVac = c.internships[0];
          setSelectedVacancy(firstVac);
          fetchApplicants(firstVac.id);
        }
      }
    } catch (e) {
      console.error('Failed to fetch company data:', e);
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

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setErrorMsg('');
    try {
      const res = await api.put('/companies/me', {
        name: profileName,
        industry: profileIndustry,
        website: profileWebsite,
        location: profileLocation,
        phone: profilePhone,
        contactName: profileContactName,
        contactEmail: profileContactEmail,
        description: profileDescription
      });
      if (res.data.success) {
        setMsg('Company profile updated successfully!');
        fetchCompanyData();
      }
    } catch (e: any) {
      setErrorMsg(e.response?.data?.error?.message || 'Failed to update company profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const openCreateModal = () => {
    setIsEditing(false);
    setEditVacancyId(null);
    setTitle('');
    setDescription('');
    setDurationMonths('6');
    setMode('HYBRID');
    setLocation('Pune / Remote');
    setStipend('25000');
    setVacanciesCount('3');
    setMinCgpa('7.0');
    setMaxBacklogs('0');
    setBranches('CSE, IT');
    setSkills('Java, SQL, Spring Boot');
    setResponsibilities('');
    setRequirements('');
    setDeadline(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    setShowModal(true);
  };

  const openEditModal = (vac: any) => {
    setIsEditing(true);
    setEditVacancyId(vac.id);
    setTitle(vac.title);
    setDescription(vac.description || '');
    setDurationMonths(String(vac.durationMonths || 6));
    setMode(vac.mode || 'ON_SITE');
    setLocation(vac.location || '');
    setStipend(String(vac.stipend || 0));
    setVacanciesCount(String(vac.vacancies || 1));
    setMinCgpa(String(vac.minCgpa || 0));
    setMaxBacklogs(String(vac.maxBacklogs || 0));
    try {
      setBranches(Array.isArray(JSON.parse(vac.allowedBranches)) ? JSON.parse(vac.allowedBranches).join(', ') : vac.allowedBranches);
    } catch {
      setBranches(vac.allowedBranches || '');
    }
    try {
      setSkills(Array.isArray(JSON.parse(vac.requiredSkills)) ? JSON.parse(vac.requiredSkills).join(', ') : vac.requiredSkills);
    } catch {
      setSkills(vac.requiredSkills || '');
    }
    setResponsibilities(vac.responsibilities || '');
    setRequirements(vac.requirements || '');
    setDeadline(vac.deadline || '');
    setShowModal(true);
  };

  const handleSaveVacancy = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const allowedBranches = branches.split(',').map(b => b.trim()).filter(Boolean);
      const requiredSkills = skills.split(',').map(s => s.trim()).filter(Boolean);

      const payload = {
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
        responsibilities,
        requirements,
        deadline: deadline || undefined
      };

      if (isEditing && editVacancyId) {
        const res = await api.put(`/internships/${editVacancyId}`, payload);
        if (res.data.success) {
          setMsg('Vacancy updated successfully!');
          setShowModal(false);
          fetchCompanyData();
        }
      } else {
        const res = await api.post('/internships', payload);
        if (res.data.success) {
          setMsg('New vacancy published successfully!');
          setShowModal(false);
          fetchCompanyData();
        }
      }
    } catch (e: any) {
      setErrorMsg(e.response?.data?.error?.message || 'Failed to save vacancy');
    }
  };

  const handlePublishVacancy = async (id: string) => {
    try {
      const res = await api.post(`/internships/${id}/publish`);
      if (res.data.success) {
        setMsg('Vacancy published and open for applications!');
        fetchCompanyData();
      }
    } catch (e) {
      setErrorMsg('Failed to publish vacancy');
    }
  };

  const handlePauseVacancy = async (id: string) => {
    try {
      const res = await api.post(`/internships/${id}/pause`);
      if (res.data.success) {
        setMsg('Vacancy paused.');
        fetchCompanyData();
      }
    } catch (e) {
      setErrorMsg('Failed to pause vacancy');
    }
  };

  const handleCloseVacancy = async (id: string) => {
    try {
      const res = await api.post(`/internships/${id}/close`);
      if (res.data.success) {
        setMsg('Vacancy closed.');
        fetchCompanyData();
      }
    } catch (e) {
      setErrorMsg('Failed to close vacancy');
    }
  };

  const handleDeleteVacancy = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this vacancy?')) return;
    try {
      const res = await api.delete(`/internships/${id}`);
      if (res.data.success) {
        setMsg('Vacancy deleted successfully.');
        fetchCompanyData();
      }
    } catch (e) {
      setErrorMsg('Failed to delete vacancy');
    }
  };

  const handleStatusChange = async (appId: string, status: string) => {
    setErrorMsg('');
    try {
      const res = await api.patch(`/applications/${appId}/status`, { status });
      if (res.data.success) {
        setMsg(`Candidate status updated to ${status}!`);
        if (selectedVacancy) fetchApplicants(selectedVacancy.id);
      }
    } catch (e: any) {
      setErrorMsg(e.response?.data?.error?.message || 'Failed to update status');
    }
  };

  const openOfferModal = (app: any) => {
    setOfferAppId(app.id);
    setOfferCandidateName(app.student?.fullName || 'Candidate');
    setOfferRole(app.internship?.title || selectedVacancy?.title || 'Engineering Intern');
    setOfferStartDate(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    setOfferEndDate(new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    setOfferStipend(String(app.internship?.stipend || selectedVacancy?.stipend || 25000));
    setOfferLocation(app.internship?.location || selectedVacancy?.location || 'Pune / Hybrid');
    setOfferTerms('Standard 40 hours per week internship. IP rights assigned to company.');
    setOfferDeadline(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    setShowOfferModal(true);
  };

  const handleCreateOfferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!offerAppId) return;
    setIssuingOffer(true);
    setErrorMsg('');
    try {
      const res = await api.post(`/applications/${offerAppId}/offer`, {
        role: offerRole,
        startDate: offerStartDate,
        endDate: offerEndDate,
        stipend: parseFloat(offerStipend),
        location: offerLocation,
        terms: offerTerms,
        acceptanceDeadline: offerDeadline
      });
      if (res.data.success) {
        setMsg(`Official offer letter issued to ${offerCandidateName}!`);
        setShowOfferModal(false);
        if (selectedVacancy) fetchApplicants(selectedVacancy.id);
      }
    } catch (e: any) {
      setErrorMsg(e.response?.data?.error?.message || 'Failed to issue offer');
    } finally {
      setIssuingOffer(false);
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
      setErrorMsg('Failed to submit evaluation');
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
      setErrorMsg('Failed to update PPO');
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-400">Loading recruiter workspace...</div>;

  const filteredVacancies = (company?.internships || []).filter((vac: any) => {
    if (vacancyFilter !== 'ALL' && vac.status !== vacancyFilter) return false;
    if (vacancySearch.trim()) {
      const q = vacancySearch.toLowerCase();
      const matchTitle = vac.title?.toLowerCase().includes(q);
      const matchDesc = vac.description?.toLowerCase().includes(q);
      const matchSkills = vac.requiredSkills?.toLowerCase().includes(q);
      return matchTitle || matchDesc || matchSkills;
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      {/* Header Banner */}
      <div className="glass-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-indigo-500/30">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
            <Building2 className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold text-white">{company?.name || 'Recruiter Hub'}</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                {company?.verificationStatus || 'VERIFIED'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Industry: {company?.industry || 'Technology'} &bull; Contact: {company?.contactName} ({company?.contactEmail})
            </p>
          </div>
        </div>

        <button onClick={openCreateModal} className="btn-primary text-xs flex items-center justify-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>Post New Vacancy</span>
        </button>
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

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="glass-card p-4 border-indigo-500/30">
          <span className="text-slate-400 block font-semibold">Total Vacancies</span>
          <span className="text-2xl font-black text-indigo-400 mt-1 block">
            {company?.stats?.totalVacancies || 0}
          </span>
        </div>
        <div className="glass-card p-4 border-emerald-500/30">
          <span className="text-slate-400 block font-semibold">Active Openings</span>
          <span className="text-2xl font-black text-emerald-400 mt-1 block">
            {company?.stats?.activeVacancies || 0}
          </span>
        </div>
        <div className="glass-card p-4 border-cyan-500/30">
          <span className="text-slate-400 block font-semibold">Total Applicants</span>
          <span className="text-2xl font-black text-cyan-400 mt-1 block">
            {company?.stats?.totalApplications || 0}
          </span>
        </div>
        <div className="glass-card p-4 border-amber-500/30">
          <span className="text-slate-400 block font-semibold">PPOs Issued</span>
          <span className="text-2xl font-black text-amber-400 mt-1 block">
            {company?.stats?.totalPPOs || 0}
          </span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-2 text-xs">
        <button
          onClick={() => setActiveTab('vacancies')}
          className={`px-4 py-2 rounded-xl font-semibold transition-all ${
            activeTab === 'vacancies' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          💼 Vacancy Manager ({company?.internships?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2 rounded-xl font-semibold transition-all ${
            activeTab === 'profile' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          🏢 Company Profile
        </button>
        <button
          onClick={() => setActiveTab('applicants')}
          className={`px-4 py-2 rounded-xl font-semibold transition-all ${
            activeTab === 'applicants' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          ✨ AI Candidate Ranker ({applicants.length})
        </button>
        <button
          onClick={() => setActiveTab('evaluations')}
          className={`px-4 py-2 rounded-xl font-semibold transition-all ${
            activeTab === 'evaluations' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          📋 Intern Evaluations
        </button>
        <button
          onClick={() => setActiveTab('ppo')}
          className={`px-4 py-2 rounded-xl font-semibold transition-all ${
            activeTab === 'ppo' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          🎓 PPO Management
        </button>
      </div>

      {/* TAB 1: VACANCIES MANAGEMENT */}
      {activeTab === 'vacancies' && (
        <div className="space-y-4">
          {/* Controls Bar: Search & Status Filters */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 p-2 bg-slate-900/90 rounded-2xl border border-slate-800 text-xs">
            <div className="flex flex-wrap gap-1.5 w-full md:w-auto">
              {['ALL', 'OPEN', 'PAUSED', 'CLOSED', 'DRAFT'].map((st) => (
                <button
                  key={st}
                  onClick={() => setVacancyFilter(st)}
                  className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
                    vacancyFilter === st ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search title, skills, keywords..."
                value={vacancySearch}
                onChange={(e) => setVacancySearch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-white text-xs rounded-xl pl-9 pr-3 py-2"
              />
            </div>
          </div>

          {filteredVacancies.length === 0 ? (
            <div className="glass-card p-8 text-center text-slate-400 text-xs">
              No vacancies match the selected filter. Click "Post New Vacancy" to publish your first role.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredVacancies.map((vac: any) => (
                <div
                  key={vac.id}
                  className="glass-card p-5 border-slate-800 hover:border-indigo-500/50 transition-all flex flex-col justify-between space-y-4 text-xs"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-white text-base">{vac.title}</h3>
                        <p className="text-slate-400 text-[11px] mt-0.5">
                          {vac.mode} &bull; {vac.location} &bull; {vac.durationMonths} Months
                        </p>
                      </div>
                      <StatusBadge status={vac.status} />
                    </div>

                    <p className="text-slate-300 line-clamp-2 text-xs">{vac.description}</p>

                    {/* Criteria Grid */}
                    <div className="grid grid-cols-3 gap-2 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 text-[11px]">
                      <div>
                        <span className="text-slate-500 block text-[10px]">Stipend</span>
                        <strong className="text-emerald-400">₹{vac.stipend}/mo</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Min CGPA</span>
                        <strong className="text-cyan-400">{vac.minCgpa || '0.0'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Applicants</span>
                        <strong className="text-indigo-400">{vac.applications?.length || vac._count?.applications || 0}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons Row */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-800">
                    <div className="flex items-center space-x-1.5">
                      {vac.status === 'OPEN' ? (
                        <button
                          onClick={() => handlePauseVacancy(vac.id)}
                          className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/30 flex items-center space-x-1 hover:bg-amber-500/20"
                        >
                          <PauseCircle className="w-3.5 h-3.5" />
                          <span>Pause</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handlePublishVacancy(vac.id)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1 hover:bg-emerald-500/20"
                        >
                          <PlayCircle className="w-3.5 h-3.5" />
                          <span>Publish / Open</span>
                        </button>
                      )}

                      {vac.status !== 'CLOSED' && (
                        <button
                          onClick={() => handleCloseVacancy(vac.id)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 flex items-center space-x-1 hover:bg-slate-700"
                        >
                          <StopCircle className="w-3.5 h-3.5" />
                          <span>Close</span>
                        </button>
                      )}

                      <button
                        onClick={() => openEditModal(vac)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 flex items-center space-x-1 hover:text-white"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setSelectedVacancy(vac);
                          fetchApplicants(vac.id);
                          setActiveTab('applicants');
                        }}
                        className="btn-primary text-[11px] py-1 px-3 bg-indigo-600 hover:bg-indigo-500"
                      >
                        View Candidates ({vac.applications?.length || vac._count?.applications || 0})
                      </button>

                      <button
                        onClick={() => handleDeleteVacancy(vac.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-400"
                        title="Delete Vacancy"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: COMPANY PROFILE MANAGEMENT */}
      {activeTab === 'profile' && (
        <div className="glass-card p-6 max-w-2xl space-y-6">
          <div>
            <h3 className="text-lg font-bold text-white">Company Profile & Verification Information</h3>
            <p className="text-xs text-slate-400 mt-1">Manage institutional recruitment details, branding, and contact channels.</p>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Company Name</label>
                <input
                  type="text"
                  required
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-2.5"
                />
              </div>
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Industry Sector</label>
                <input
                  type="text"
                  placeholder="e.g. Fintech, Cloud & AI, E-Commerce"
                  value={profileIndustry}
                  onChange={(e) => setProfileIndustry(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-2.5"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Official Website</label>
                <input
                  type="url"
                  placeholder="https://company.com"
                  value={profileWebsite}
                  onChange={(e) => setProfileWebsite(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-2.5"
                />
              </div>
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Headquarters / Location</label>
                <input
                  type="text"
                  placeholder="e.g. Pune / Bengaluru"
                  value={profileLocation}
                  onChange={(e) => setProfileLocation(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-2.5"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Contact Person</label>
                <input
                  type="text"
                  required
                  value={profileContactName}
                  onChange={(e) => setProfileContactName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-2.5"
                />
              </div>
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Contact Email</label>
                <input
                  type="email"
                  required
                  value={profileContactEmail}
                  onChange={(e) => setProfileContactEmail(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-2.5"
                />
              </div>
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Phone Number</label>
                <input
                  type="text"
                  placeholder="+91 9876543210"
                  value={profilePhone}
                  onChange={(e) => setProfilePhone(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-2.5"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Company Description & Culture</label>
              <textarea
                rows={4}
                value={profileDescription}
                onChange={(e) => setProfileDescription(e.target.value)}
                placeholder="Provide details about your company mission and internship program..."
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-2.5"
              />
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              className="btn-primary text-xs py-2.5 px-6 bg-indigo-600 hover:bg-indigo-500"
            >
              {savingProfile ? 'Saving Profile...' : 'Save Company Profile'}
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: AI CANDIDATE RANKER & APPLICANTS */}
      {activeTab === 'applicants' && (
        <div className="space-y-4">
          <div className="glass-card p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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

                    {/* Offer Summary if already issued */}
                    {app.offer && (
                      <div className="p-3 bg-emerald-950/20 border border-emerald-500/30 rounded-xl space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-emerald-400">Offer Issued ({app.offer.role})</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            app.offer.studentResponse === 'ACCEPTED'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : app.offer.studentResponse === 'DECLINED'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}>
                            Response: {app.offer.studentResponse}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300">
                          Stipend: ₹{app.offer.stipend?.toLocaleString()}/mo &bull; Location: {app.offer.location} &bull; Code: <span className="font-mono text-cyan-400">{app.offer.verificationCode?.slice(0, 8)}...</span>
                        </p>
                      </div>
                    )}

                    {/* Candidate Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800">
                      {app.status === 'APPLIED' && (
                        <button onClick={() => handleStatusChange(app.id, 'UNDER_REVIEW')} className="btn-secondary text-[11px] py-1.5 px-3">
                          Review Profile
                        </button>
                      )}
                      {['APPLIED', 'UNDER_REVIEW'].includes(app.status) && (
                        <button onClick={() => handleStatusChange(app.id, 'SHORTLISTED')} className="btn-secondary text-[11px] py-1.5 px-3 text-cyan-400 border-cyan-500/30 bg-cyan-500/10">
                          Shortlist Candidate
                        </button>
                      )}
                      {['SHORTLISTED', 'SELECTED'].includes(app.status) && (
                        <button onClick={() => openOfferModal(app)} className="btn-primary text-[11px] py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500">
                          {app.offer ? 'Update / Re-Issue Offer' : 'Generate Formal Offer'}
                        </button>
                      )}
                      {['APPLIED', 'UNDER_REVIEW', 'SHORTLISTED'].includes(app.status) && (
                        <button onClick={() => handleStatusChange(app.id, 'REJECTED')} className="btn-secondary text-[11px] py-1.5 px-3 hover:text-rose-400">
                          Reject
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: INTERN EVALUATION RUBRIC */}
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

      {/* TAB 5: PPO MANAGEMENT */}
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

      {/* CREATE / EDIT VACANCY MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass-card p-6 w-full max-w-2xl space-y-4 max-h-[90vh] overflow-y-auto border-indigo-500/40">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">
                {isEditing ? 'Edit Internship Vacancy' : 'Create New Internship Vacancy'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white p-1">✕</button>
            </div>

            <form onSubmit={handleSaveVacancy} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Role Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cloud DevOps Engineer Intern"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-2.5"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Job Description</label>
                <textarea
                  rows={3}
                  placeholder="Describe the opportunity, projects, and impact..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-2.5"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Duration (Months)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={durationMonths}
                    onChange={(e) => setDurationMonths(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-2.5"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Work Mode</label>
                  <select
                    value={mode}
                    onChange={(e) => setMode(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-2.5"
                  >
                    <option value="REMOTE">REMOTE</option>
                    <option value="HYBRID">HYBRID</option>
                    <option value="ON_SITE">ON-SITE</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Bengaluru / Remote"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-2.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Stipend (₹/month)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={stipend}
                    onChange={(e) => setStipend(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-2.5"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Openings Count</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={vacanciesCount}
                    onChange={(e) => setVacanciesCount(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-2.5"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Application Deadline</label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-2.5"
                  />
                </div>
              </div>

              {/* Eligibility Thresholds */}
              <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-3">
                <span className="font-bold text-slate-300 block">Eligibility Criteria Configuration</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 block mb-1">Minimum CGPA (0.0 - 10.0)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="10"
                      value={minCgpa}
                      onChange={(e) => setMinCgpa(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl p-2"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Max Active Backlogs Allowed</label>
                    <input
                      type="number"
                      min="0"
                      value={maxBacklogs}
                      onChange={(e) => setMaxBacklogs(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl p-2"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Allowed Branches (Comma-separated or ALL)</label>
                  <input
                    type="text"
                    placeholder="e.g. CSE, IT, AI/DS"
                    value={branches}
                    onChange={(e) => setBranches(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl p-2"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Required Skills (Comma-separated)</label>
                  <input
                    type="text"
                    placeholder="e.g. Java, SQL, Spring Boot, React"
                    value={skills}
                    onChange={(e) => setSkills(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl p-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Key Responsibilities</label>
                  <textarea
                    rows={2}
                    placeholder="Key deliverables and daily tasks..."
                    value={responsibilities}
                    onChange={(e) => setResponsibilities(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-2.5"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Role Requirements</label>
                  <textarea
                    rows={2}
                    placeholder="Must-have qualifications and soft skills..."
                    value={requirements}
                    onChange={(e) => setRequirements(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-2.5"
                  />
                </div>
              </div>

              <div className="flex space-x-2 pt-2 border-t border-slate-800">
                <button type="submit" className="flex-1 btn-primary py-2.5 bg-indigo-600 hover:bg-indigo-500">
                  {isEditing ? 'Save Changes' : 'Publish Vacancy'}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary py-2.5 px-4">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* OFFER GENERATION MODAL DIALOG */}
      {/* ======================================================== */}
      {showOfferModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                  <Award className="w-5 h-5 text-emerald-400" />
                  <span>Generate Official Offer Letter</span>
                </h3>
                <p className="text-xs text-slate-400">Recipient: <strong className="text-white">{offerCandidateName}</strong></p>
              </div>
              <button onClick={() => setShowOfferModal(false)} className="text-slate-400 hover:text-white p-1">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateOfferSubmit} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Official Internship Role Title</label>
                <input
                  type="text"
                  required
                  value={offerRole}
                  onChange={(e) => setOfferRole(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl p-2.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Monthly Stipend (₹)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={offerStipend}
                    onChange={(e) => setOfferStipend(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl p-2.5"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Work Location</label>
                  <input
                    type="text"
                    required
                    value={offerLocation}
                    onChange={(e) => setOfferLocation(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl p-2.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Internship Start Date</label>
                  <input
                    type="date"
                    required
                    value={offerStartDate}
                    onChange={(e) => setOfferStartDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl p-2.5"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Expected End Date</label>
                  <input
                    type="date"
                    required
                    value={offerEndDate}
                    onChange={(e) => setOfferEndDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl p-2.5"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Candidate Acceptance Deadline</label>
                <input
                  type="date"
                  required
                  value={offerDeadline}
                  onChange={(e) => setOfferDeadline(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl p-2.5"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Internship Terms & Conditions</label>
                <textarea
                  rows={3}
                  required
                  value={offerTerms}
                  onChange={(e) => setOfferTerms(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl p-2.5"
                />
              </div>

              <div className="flex space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="submit"
                  disabled={issuingOffer}
                  className="flex-1 btn-primary py-2.5 bg-emerald-600 hover:bg-emerald-500 font-semibold"
                >
                  {issuingOffer ? 'Issuing Offer...' : 'Confirm & Issue Offer Letter'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowOfferModal(false)}
                  className="btn-secondary py-2.5 px-4"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
