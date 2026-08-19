import React, { useState } from 'react';
import { GraduationCap, Building2, ShieldCheck, UserCheck, Search, Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';

interface LandingPageProps {
  onNavigateLogin: (role?: string) => void;
  onNavigateVerify: (code: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigateLogin, onNavigateVerify }) => {
  const [searchCode, setSearchCode] = useState('');
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [searching, setSearching] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleVerifySearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchCode.trim()) return;
    setSearching(true);
    setErrorMsg('');
    setVerifyResult(null);

    try {
      const res = await api.get(`/verify/offer/${searchCode.trim()}`);
      if (res.data.success) {
        setVerifyResult(res.data.data);
      }
    } catch (e: any) {
      setErrorMsg('No verified offer found for this code or offer pending T&P verification.');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Banner */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-slate-800/80 max-w-7xl mx-auto w-full">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-extrabold bg-gradient-to-r from-white to-cyan-400 bg-clip-text text-transparent">
            InternAI Platform
          </span>
        </div>

        <div className="flex items-center space-x-3">
          <button onClick={() => onNavigateLogin()} className="btn-secondary text-xs">
            Sign In
          </button>
          <button onClick={() => onNavigateLogin('STUDENT')} className="btn-primary text-xs">
            Get Started
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto px-6 py-12 w-full space-y-16">
        <div className="text-center max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold">
            <Sparkles className="w-4 h-4" />
            <span>AI-Powered Institutional Internship Management System</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight bg-gradient-to-b from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
            End-to-End Internship Lifecycle Management for Colleges
          </h1>

          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            Centralizing profile verification, deterministic eligibility checking, AI candidate matching, offer letters, T&P verifications, faculty mentor progress tracking, evaluations, completions, and PPOs.
          </p>
        </div>

        {/* 4 Primary User Role Portal Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div
            onClick={() => onNavigateLogin('STUDENT')}
            className="glass-card p-6 border-slate-700/60 hover:border-cyan-500/50 hover:bg-slate-800/80 transition-all cursor-pointer group space-y-4"
          >
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20 group-hover:scale-110 transition-transform">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white group-hover:text-cyan-400 transition-colors">Student Portal</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Profile verification, eligibility status, internship discovery, weekly progress logs, PPO tracking.
              </p>
            </div>
            <div className="flex items-center text-xs font-semibold text-cyan-400 space-x-1">
              <span>Sign In as Student</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>

          <div
            onClick={() => onNavigateLogin('COMPANY')}
            className="glass-card p-6 border-slate-700/60 hover:border-indigo-500/50 hover:bg-slate-800/80 transition-all cursor-pointer group space-y-4"
          >
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20 group-hover:scale-110 transition-transform">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white group-hover:text-indigo-400 transition-colors">Company Portal</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Post vacancies, define criteria, AI candidate ranking, issue offer letters, intern evaluations & PPOs.
              </p>
            </div>
            <div className="flex items-center text-xs font-semibold text-indigo-400 space-x-1">
              <span>Sign In as Recruiter</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>

          <div
            onClick={() => onNavigateLogin('TNP')}
            className="glass-card p-6 border-slate-700/60 hover:border-amber-500/50 hover:bg-slate-800/80 transition-all cursor-pointer group space-y-4"
          >
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white group-hover:text-amber-400 transition-colors">T&P Admin Portal</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Profile & offer verifications, faculty mentor assignments, completion checks, institutional analytics.
              </p>
            </div>
            <div className="flex items-center text-xs font-semibold text-amber-400 space-x-1">
              <span>Sign In as T&P Admin</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>

          <div
            onClick={() => onNavigateLogin('MENTOR')}
            className="glass-card p-6 border-slate-700/60 hover:border-emerald-500/50 hover:bg-slate-800/80 transition-all cursor-pointer group space-y-4"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 group-hover:scale-110 transition-transform">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white group-hover:text-emerald-400 transition-colors">Faculty Mentor</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Assigned student roster, weekly progress report reviews, issue flagging, final mentor rubrics.
              </p>
            </div>
            <div className="flex items-center text-xs font-semibold text-emerald-400 space-x-1">
              <span>Sign In as Mentor</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Public Offer Verification Search Widget */}
        <div className="glass-card p-8 border-cyan-500/30 max-w-2xl mx-auto text-center space-y-6">
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-white flex items-center justify-center space-x-2">
              <ShieldCheck className="w-6 h-6 text-cyan-400" />
              <span>Public Offer Verification Tool</span>
            </h3>
            <p className="text-xs text-slate-400">
              Verify authentic T&P approved internship offer letters by entering the unique verification code.
            </p>
          </div>

          <form onSubmit={handleVerifySearch} className="flex gap-2">
            <input
              type="text"
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              placeholder="e.g. OFFER-TECHCORP-2026-9981"
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
            <button type="submit" disabled={searching} className="btn-primary text-xs flex items-center space-x-2">
              <Search className="w-4 h-4" />
              <span>{searching ? 'Verifying...' : 'Verify Offer'}</span>
            </button>
          </form>

          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs">
              {errorMsg}
            </div>
          )}

          {verifyResult && (
            <div className="p-5 bg-emerald-950/20 border border-emerald-500/30 rounded-xl text-left space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 flex items-center space-x-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Authentic Verified Offer</span>
                </span>
                <StatusBadge status="VERIFIED" />
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs text-slate-300">
                <div><span className="text-slate-500 block">Candidate:</span> {verifyResult.studentName}</div>
                <div><span className="text-slate-500 block">Company:</span> {verifyResult.companyName}</div>
                <div><span className="text-slate-500 block">Role:</span> {verifyResult.roleTitle}</div>
                <div><span className="text-slate-500 block">Stipend:</span> {verifyResult.stipend}</div>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="px-6 py-6 border-t border-slate-900 text-center text-xs text-slate-500">
        Internship Management System &copy; 2026. Institutional Workflow & Governance Engine.
      </footer>
    </div>
  );
};
