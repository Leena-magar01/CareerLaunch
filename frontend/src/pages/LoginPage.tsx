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
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-6 py-12">
      <button
        onClick={onNavigateHome}
        className="fixed top-6 left-6 text-xs text-slate-400 hover:text-white flex items-center space-x-1.5 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Home</span>
      </button>

      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 mb-2">
            <GraduationCap className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white">Sign In to Platform</h2>
          <p className="text-xs text-slate-400">Access your role-specific dashboard</p>
        </div>

        {/* One-Click Quick Demo Login Shortcuts */}
        <div className="glass-card p-4 space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 block text-center">
            ⚡ Quick Demo 1-Click Fill
          </span>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={() => fillDemoAccount('student@college.edu')}
              className="p-2 rounded-xl bg-slate-900/80 hover:bg-cyan-950/40 border border-slate-700 hover:border-cyan-500/50 text-slate-300 text-left flex items-center space-x-2 transition-all"
            >
              <GraduationCap className="w-4 h-4 text-cyan-400" />
              <span>Student</span>
            </button>
            <button
              onClick={() => fillDemoAccount('recruiter@techcorp.com')}
              className="p-2 rounded-xl bg-slate-900/80 hover:bg-indigo-950/40 border border-slate-700 hover:border-indigo-500/50 text-slate-300 text-left flex items-center space-x-2 transition-all"
            >
              <Building2 className="w-4 h-4 text-indigo-400" />
              <span>Company</span>
            </button>
            <button
              onClick={() => fillDemoAccount('tnp@college.edu')}
              className="p-2 rounded-xl bg-slate-900/80 hover:bg-amber-950/40 border border-slate-700 hover:border-amber-500/50 text-slate-300 text-left flex items-center space-x-2 transition-all"
            >
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>T&P Admin</span>
            </button>
            <button
              onClick={() => fillDemoAccount('mentor@college.edu')}
              className="p-2 rounded-xl bg-slate-900/80 hover:bg-emerald-950/40 border border-slate-700 hover:border-emerald-500/50 text-slate-300 text-left flex items-center space-x-2 transition-all"
            >
              <UserCheck className="w-4 h-4 text-emerald-400" />
              <span>Mentor</span>
            </button>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="glass-card p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
              {errorMsg}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@domain.com"
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl pl-9 pr-4 py-2.5 text-xs focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl pl-9 pr-4 py-2.5 text-xs focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <button type="submit" disabled={submitting} className="w-full btn-primary text-xs py-3 mt-2">
            {submitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-xs text-slate-400">
          Don't have an account?{' '}
          <button onClick={onNavigateRegister} className="text-cyan-400 font-semibold hover:underline">
            Register here
          </button>
        </p>
      </div>
    </div>
  );
};
