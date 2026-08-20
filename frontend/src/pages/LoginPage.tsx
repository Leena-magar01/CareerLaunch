import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { GraduationCap, Building2, ShieldCheck, UserCheck, Lock, Mail, ArrowLeft } from 'lucide-react';

interface LoginPageProps {
  initialRole?: string;
  onNavigateRegister: () => void;
  onNavigateHome: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ initialRole = 'STUDENT', onNavigateRegister, onNavigateHome }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);

    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data.success) {
        login(res.data.data.token, res.data.data.user);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error?.message || 'Invalid login credentials');
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemoAccount = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('password123');
  };

  return (
    <div className="min-h-screen bg-[#FCFCFC] text-[#243447] flex flex-col justify-center items-center px-6 py-12 font-sans relative">
      <button
        onClick={onNavigateHome}
        className="fixed top-6 left-6 text-xs text-[#667085] hover:text-[#243447] flex items-center space-x-1.5 transition-colors font-medium"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Home</span>
      </button>

      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3.5 rounded-xl bg-[#E9F3FD] text-[#4874A0] border border-[#66A3BF]/30 mb-1">
            <GraduationCap className="w-7 h-7 text-[#66A3BF]" />
          </div>
          <h2 className="text-2xl font-bold text-[#243447] tracking-tight">Sign In to Platform</h2>
          <p className="text-xs text-[#667085]">Access your institutional role dashboard</p>
        </div>

        {/* 1-Click Quick Demo Login Shortcuts */}
        <div className="card-base p-4 space-y-3 bg-white">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#4874A0] block text-center">
            ⚡ Quick Demo 1-Click Fill
          </span>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={() => fillDemoAccount('student@college.edu')}
              className="p-2.5 rounded-lg bg-[#E9F3FD]/50 hover:bg-[#E9F3FD] border border-[#D8E2E6] hover:border-[#66A3BF] text-[#243447] text-left flex items-center space-x-2 transition-all"
            >
              <GraduationCap className="w-4 h-4 text-[#66A3BF]" />
              <span className="font-medium">Student</span>
            </button>
            <button
              onClick={() => fillDemoAccount('recruiter@techcorp.com')}
              className="p-2.5 rounded-lg bg-[#E9F3FD]/50 hover:bg-[#E9F3FD] border border-[#D8E2E6] hover:border-[#66A3BF] text-[#243447] text-left flex items-center space-x-2 transition-all"
            >
              <Building2 className="w-4 h-4 text-[#4874A0]" />
              <span className="font-medium">Company</span>
            </button>
            <button
              onClick={() => fillDemoAccount('tnp@college.edu')}
              className="p-2.5 rounded-lg bg-[#E9F3FD]/50 hover:bg-[#E9F3FD] border border-[#D8E2E6] hover:border-[#66A3BF] text-[#243447] text-left flex items-center space-x-2 transition-all"
            >
              <ShieldCheck className="w-4 h-4 text-[#C9963E]" />
              <span className="font-medium">T&P Admin</span>
            </button>
            <button
              onClick={() => fillDemoAccount('mentor@college.edu')}
              className="p-2.5 rounded-lg bg-[#E9F3FD]/50 hover:bg-[#E9F3FD] border border-[#D8E2E6] hover:border-[#66A3BF] text-[#243447] text-left flex items-center space-x-2 transition-all"
            >
              <UserCheck className="w-4 h-4 text-[#4F8A68]" />
              <span className="font-medium">Mentor</span>
            </button>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="card-base p-6 space-y-4 bg-white">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-[#C95A5A]/10 border border-[#C95A5A]/30 text-[#C95A5A] text-xs">
              {errorMsg}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#243447]">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#667085] absolute left-3 top-2.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@domain.com"
                className="input-base text-xs !pl-9"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#243447]">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#667085] absolute left-3 top-2.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-base text-xs !pl-9"
              />
            </div>
          </div>

          <button type="submit" disabled={submitting} className="w-full btn-primary text-xs py-2.5 mt-2">
            {submitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-xs text-[#667085]">
          Don't have an account?{' '}
          <button onClick={onNavigateRegister} className="text-[#66A3BF] font-semibold hover:underline">
            Register here
          </button>
        </p>
      </div>
    </div>
  );
};

