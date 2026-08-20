import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useGoogleLogin } from '@react-oauth/google';
import { api } from '../services/api';
import { GraduationCap, Building2, UserCheck, ShieldCheck, Lock, Mail, ArrowLeft } from 'lucide-react';

interface LoginPageProps {
  initialRole?: string;
  onNavigateRegister: () => void;
  onNavigateHome: () => void;
}

// Google logo SVG
const GoogleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  </svg>
);

// Google Sign-In Button — always visible, uses implicit OAuth flow
const GoogleSignInButton: React.FC<{ role: string; onError: (msg: string) => void }> = ({ role, onError }) => {
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      try {
        const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        const userInfo = await userInfoRes.json();
        const res = await api.post('/auth/google', {
          email: userInfo.email,
          name: userInfo.name,
          googleId: userInfo.sub,
          picture: userInfo.picture,
          role,
        });
        if (res.data.success) {
          login(res.data.data.token, res.data.data.user);
        } else {
          onError('Google sign-in failed. Please try again.');
        }
      } catch (err: any) {
        onError(err?.response?.data?.error?.message || 'Google sign-in failed. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    onError: () => onError('Google sign-in was cancelled or failed.'),
  });

  return (
    <button
      type="button"
      onClick={() => { setLoading(true); googleLogin(); }}
      disabled={loading}
      className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 border border-[#D8E2E6] rounded-lg bg-white hover:bg-[#F8FAFC] hover:border-[#66A3BF] text-[#243447] text-xs font-medium transition-all shadow-sm"
    >
      <GoogleIcon />
      <span>{loading ? 'Signing in with Google...' : 'Continue with Google'}</span>
    </button>
  );
};

export const LoginPage: React.FC<LoginPageProps> = ({ initialRole = 'STUDENT', onNavigateRegister, onNavigateHome }) => {
  const { login } = useAuth();
  const [role, setRole] = useState<'STUDENT' | 'COMPANY' | 'MENTOR' | 'TNP'>(
    (initialRole as 'STUDENT' | 'COMPANY' | 'MENTOR' | 'TNP') || 'STUDENT'
  );
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



  return (
    <div className="min-h-screen bg-[#FCFCFC] text-[#243447] flex flex-col justify-center items-center px-6 py-12 font-sans relative">
      <button
        onClick={onNavigateHome}
        className="fixed top-6 left-6 text-xs text-[#667085] hover:text-[#243447] flex items-center space-x-1.5 transition-colors font-medium"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Home</span>
      </button>

      <div className="w-full max-w-md space-y-5">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3.5 rounded-xl bg-[#E9F3FD] text-[#4874A0] border border-[#66A3BF]/30 mb-1">
            <GraduationCap className="w-7 h-7 text-[#66A3BF]" />
          </div>
          <h2 className="text-2xl font-bold text-[#243447] tracking-tight">Sign In to Platform</h2>
          <p className="text-xs text-[#667085]">Access your institutional role dashboard</p>
        </div>

        {/* Role Selector Tabs */}
        <div className="grid grid-cols-2 gap-2 bg-[#E9F3FD]/40 p-1.5 rounded-lg border border-[#D8E2E6] text-xs">
          <button
            type="button"
            onClick={() => setRole('STUDENT')}
            className={`py-2 px-3 rounded-md font-semibold flex items-center justify-center space-x-1.5 transition-colors ${
              role === 'STUDENT'
                ? 'bg-white text-[#4874A0] shadow-sm border border-[#D8E2E6]'
                : 'text-[#667085] hover:text-[#243447]'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Student</span>
          </button>
          <button
            type="button"
            onClick={() => setRole('COMPANY')}
            className={`py-2 px-3 rounded-md font-semibold flex items-center justify-center space-x-1.5 transition-colors ${
              role === 'COMPANY'
                ? 'bg-white text-[#4874A0] shadow-sm border border-[#D8E2E6]'
                : 'text-[#667085] hover:text-[#243447]'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Company</span>
          </button>
          <button
            type="button"
            onClick={() => setRole('MENTOR')}
            className={`py-2 px-3 rounded-md font-semibold flex items-center justify-center space-x-1.5 transition-colors ${
              role === 'MENTOR'
                ? 'bg-white text-[#4874A0] shadow-sm border border-[#D8E2E6]'
                : 'text-[#667085] hover:text-[#243447]'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Mentor</span>
          </button>
          <button
            type="button"
            onClick={() => setRole('TNP')}
            className={`py-2 px-3 rounded-md font-semibold flex items-center justify-center space-x-1.5 transition-colors ${
              role === 'TNP'
                ? 'bg-white text-[#4874A0] shadow-sm border border-[#D8E2E6]'
                : 'text-[#667085] hover:text-[#243447]'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>T&amp;P Admin</span>
          </button>
        </div>

        {/* Google Sign-In Card */}
        <div className="card-base p-5 bg-white space-y-3">
          <p className="text-[11px] font-semibold text-[#667085] text-center uppercase tracking-wider">
            Quick Sign-In
          </p>
          {errorMsg && (
            <div className="p-3 rounded-lg bg-[#C95A5A]/10 border border-[#C95A5A]/30 text-[#C95A5A] text-xs">
              {errorMsg}
            </div>
          )}
          <GoogleSignInButton role={role} onError={setErrorMsg} />
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="card-base p-6 space-y-4 bg-white">
          {/* OR divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[#D8E2E6]" />
            <span className="text-[10px] text-[#667085] font-medium">OR sign in with email</span>
            <div className="flex-1 h-px bg-[#D8E2E6]" />
          </div>

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
