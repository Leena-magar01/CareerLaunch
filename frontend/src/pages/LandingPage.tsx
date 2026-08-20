import React, { useState } from 'react';
import { GraduationCap, Building2, ShieldCheck, UserCheck, Search, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/StatusBadge';

// Google SVG logo
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  </svg>
);

// Custom Google button — always visible, uses implicit OAuth flow (access_token)
interface GoogleSignInButtonProps {
  role: string;
  onLoginSuccess: (token: string, user: any) => void;
  onLoginError: (msg: string) => void;
}
const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({ role, onLoginSuccess, onLoginError }) => {
  const [loading, setLoading] = useState(false);

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      try {
        // Fetch Google user info using the access token
        const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        const userInfo = await userInfoRes.json();

        // Send user info + role to our backend
        const res = await api.post('/auth/google', {
          email: userInfo.email,
          name: userInfo.name,
          googleId: userInfo.sub,
          picture: userInfo.picture,
          role,
        });

        if (res.data.success) {
          onLoginSuccess(res.data.data.token, res.data.data.user);
        } else {
          onLoginError('Google sign-in failed. Please try again.');
        }
      } catch (err: any) {
        const msg = err?.response?.data?.error?.message || 'Google sign-in failed. Please try again.';
        onLoginError(msg);
      } finally {
        setLoading(false);
      }
    },
    onError: () => onLoginError('Google sign-in was cancelled or failed.'),
  });

  return (
    <button
      type="button"
      onClick={() => { setLoading(true); googleLogin(); }}
      disabled={loading}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        width: '100%',
        padding: '8px 12px',
        border: '1px solid #D8E2E6',
        borderRadius: '6px',
        background: '#ffffff',
        color: '#243447',
        fontSize: '12px',
        fontWeight: 500,
        cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.7 : 1,
        transition: 'box-shadow 0.15s, border-color 0.15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(102,163,191,0.25)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
    >
      <GoogleIcon />
      <span>{loading ? 'Signing in...' : 'Continue with Google'}</span>
    </button>
  );
};

interface LandingPageProps {
  onNavigateLogin: (role?: string) => void;
  onNavigateVerify: (code: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigateLogin, onNavigateVerify }) => {
  const { login } = useAuth();
  const [searchCode, setSearchCode] = useState('');
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [searching, setSearching] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [googleError, setGoogleError] = useState('');

  const handleGoogleLoginSuccess = (token: string, user: any) => {
    setGoogleError('');
    login(token, user);
  };

  const handleGoogleLoginError = (msg: string) => {
    setGoogleError(msg);
  };

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
    <div className="min-h-screen bg-[#FCFCFC] text-[#243447] flex flex-col font-sans">
      {/* Top Header */}
      <header className="bg-white border-b border-[#D8E2E6] px-6 py-4 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-[#66A3BF] flex items-center justify-center text-white shadow-sm">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xl font-bold text-[#243447] tracking-tight">
                Career<span className="text-[#66A3BF]">Launch</span>
              </span>
              <span className="block text-[11px] text-[#667085] font-medium">Enterprise Internship Platform</span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button onClick={() => onNavigateLogin()} className="btn-secondary text-xs">
              Sign In
            </button>
            <button onClick={() => onNavigateLogin('STUDENT')} className="btn-primary text-xs">
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-gradient-to-b from-[#E9F3FD]/60 via-[#FCFCFC] to-[#FCFCFC] pt-16 pb-14 px-6 border-b border-[#D8E2E6]/50">
          <div className="max-w-5xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#E9F3FD] border border-[#66A3BF]/30 text-[#4874A0] text-xs font-semibold">
              <ShieldCheck className="w-4 h-4 text-[#66A3BF]" />
              <span>Institutional Internship Lifecycle Management</span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-extrabold text-[#243447] tracking-tight leading-tight max-w-4xl mx-auto">
              From Internship to Employment.
            </h1>

            <p className="text-[#667085] text-base sm:text-lg max-w-3xl mx-auto leading-relaxed">
              One platform to manage internship applications, verified attendance, progress tracking, faculty evaluations, and career placement readiness.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button onClick={() => onNavigateLogin('STUDENT')} className="btn-primary text-sm px-6 py-2.5">
                <span>Get Started as Student</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button onClick={() => onNavigateLogin('TNP')} className="btn-secondary text-sm px-6 py-2.5">
                <span>Explore Platform</span>
              </button>
            </div>
          </div>
        </section>

        {/* Dashboard Preview Component */}
        <section className="max-w-6xl mx-auto px-6 -mt-4 mb-16">
          <div className="card-base border-[#D8E2E6] shadow-lg bg-white p-4 overflow-hidden">
            <div className="bg-[#E9F3FD]/40 rounded-lg p-4 border border-[#D8E2E6]">
              <div className="flex items-center justify-between border-b border-[#D8E2E6] pb-3 mb-4">
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 rounded-full bg-[#C95A5A]/60"></span>
                  <span className="w-3 h-3 rounded-full bg-[#C9963E]/60"></span>
                  <span className="w-3 h-3 rounded-full bg-[#4F8A68]/60"></span>
                  <span className="text-xs text-[#667085] font-medium ml-2">CareerLaunch Dashboard Preview</span>
                </div>
                <span className="badge-status bg-[#4F8A68]/10 text-[#4F8A68] border-[#4F8A68]/20">Active Lifecycle Engine</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-left">
                <div className="bg-white p-4 rounded-lg border border-[#D8E2E6]">
                  <span className="text-xs text-[#667085]">Placement Readiness</span>
                  <p className="text-2xl font-bold text-[#243447] mt-1">82 / 100</p>
                  <span className="text-[11px] text-[#4F8A68] font-medium">Strong Profile</span>
                </div>
                <div className="bg-white p-4 rounded-lg border border-[#D8E2E6]">
                  <span className="text-xs text-[#667085]">Verified Attendance</span>
                  <p className="text-2xl font-bold text-[#243447] mt-1">94%</p>
                  <span className="text-[11px] text-[#4F8A68] font-medium">Location Verified</span>
                </div>
                <div className="bg-white p-4 rounded-lg border border-[#D8E2E6]">
                  <span className="text-xs text-[#667085]">Weekly Worklogs</span>
                  <p className="text-2xl font-bold text-[#243447] mt-1">8 / 10</p>
                  <span className="text-[11px] text-[#4874A0] font-medium">Faculty Approved</span>
                </div>
                <div className="bg-white p-4 rounded-lg border border-[#D8E2E6]">
                  <span className="text-xs text-[#667085]">Offer Status</span>
                  <p className="text-2xl font-bold text-[#243447] mt-1">Verified</p>
                  <span className="text-[11px] text-[#4F8A68] font-medium">T&P Approved</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4 Audience Portals */}
        <section className="max-w-7xl mx-auto px-6 py-10 space-y-8">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-[#243447]">Role-Based Institutional Portals</h2>
            <p className="text-sm text-[#667085] mt-1">Select your access portal to log in to CareerLaunch</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Student Portal Card */}
            <div
              onClick={() => onNavigateLogin('STUDENT')}
              className="card-base hover:border-[#66A3BF] cursor-pointer group space-y-4"
            >
              <div className="w-10 h-10 rounded-lg bg-[#E9F3FD] text-[#4874A0] flex items-center justify-center group-hover:bg-[#66A3BF] group-hover:text-white transition-colors">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-base text-[#243447] group-hover:text-[#4874A0]">Student Portal</h3>
                <p className="text-xs text-[#667085] mt-1.5 leading-relaxed">
                  Track readiness, discover opportunities, log attendance, submit worklogs, and get certified.
                </p>
              </div>
              <div className="flex items-center text-xs font-semibold text-[#4874A0] space-x-1 pt-2">
                <span>Sign In as Student</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
              <div className="pt-1" onClick={(e) => e.stopPropagation()}>
                <div className="text-[10px] text-[#667085] text-center mb-1.5">or</div>
                <GoogleSignInButton
                  role="STUDENT"
                  onLoginSuccess={handleGoogleLoginSuccess}
                  onLoginError={handleGoogleLoginError}
                />
              </div>
            </div>

            {/* Company / Recruiter Card */}
            <div
              onClick={() => onNavigateLogin('COMPANY')}
              className="card-base hover:border-[#66A3BF] cursor-pointer group space-y-4"
            >
              <div className="w-10 h-10 rounded-lg bg-[#E9F3FD] text-[#4874A0] flex items-center justify-center group-hover:bg-[#66A3BF] group-hover:text-white transition-colors">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-base text-[#243447] group-hover:text-[#4874A0]">Company / Recruiter</h3>
                <p className="text-xs text-[#667085] mt-1.5 leading-relaxed">
                  Post internship openings, screen candidates, issue verified offers, and evaluate intern performance.
                </p>
              </div>
              <div className="flex items-center text-xs font-semibold text-[#4874A0] space-x-1 pt-2">
                <span>Sign In as Recruiter</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
              <div className="pt-1" onClick={(e) => e.stopPropagation()}>
                <div className="text-[10px] text-[#667085] text-center mb-1.5">or</div>
                <GoogleSignInButton
                  role="COMPANY"
                  onLoginSuccess={handleGoogleLoginSuccess}
                  onLoginError={handleGoogleLoginError}
                />
              </div>
            </div>

            {/* T&P Placement Cell Card */}
            <div
              onClick={() => onNavigateLogin('TNP')}
              className="card-base hover:border-[#66A3BF] cursor-pointer group space-y-4"
            >
              <div className="w-10 h-10 rounded-lg bg-[#E9F3FD] text-[#4874A0] flex items-center justify-center group-hover:bg-[#66A3BF] group-hover:text-white transition-colors">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-base text-[#243447] group-hover:text-[#4874A0]">T&P Placement Cell</h3>
                <p className="text-xs text-[#667085] mt-1.5 leading-relaxed">
                  Approve offer letters, oversee faculty assignments, monitor department statistics, and track PPOs.
                </p>
              </div>
              <div className="flex items-center text-xs font-semibold text-[#4874A0] space-x-1 pt-2">
                <span>Sign In as T&P Admin</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
              <div className="pt-1" onClick={(e) => e.stopPropagation()}>
                <div className="text-[10px] text-[#667085] text-center mb-1.5">or</div>
                <GoogleSignInButton
                  role="TNP"
                  onLoginSuccess={handleGoogleLoginSuccess}
                  onLoginError={handleGoogleLoginError}
                />
              </div>
            </div>

            {/* Faculty Mentor Card */}
            <div
              onClick={() => onNavigateLogin('MENTOR')}
              className="card-base hover:border-[#66A3BF] cursor-pointer group space-y-4"
            >
              <div className="w-10 h-10 rounded-lg bg-[#E9F3FD] text-[#4874A0] flex items-center justify-center group-hover:bg-[#66A3BF] group-hover:text-white transition-colors">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-base text-[#243447] group-hover:text-[#4874A0]">Faculty Mentor</h3>
                <p className="text-xs text-[#667085] mt-1.5 leading-relaxed">
                  Review student weekly reports, verify ongoing attendance, give guidance, and grade final projects.
                </p>
              </div>
              <div className="flex items-center text-xs font-semibold text-[#4874A0] space-x-1 pt-2">
                <span>Sign In as Mentor</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
              <div className="pt-1" onClick={(e) => e.stopPropagation()}>
                <div className="text-[10px] text-[#667085] text-center mb-1.5">or</div>
                <GoogleSignInButton
                  role="MENTOR"
                  onLoginSuccess={handleGoogleLoginSuccess}
                  onLoginError={handleGoogleLoginError}
                />
              </div>
            </div>
          </div>

          {/* Google error banner */}
          {googleError && (
            <div className="mt-4 p-3 bg-[#C95A5A]/10 border border-[#C95A5A]/20 rounded-md text-[#C95A5A] text-xs text-center max-w-xl mx-auto">
              {googleError}
            </div>
          )}
        </section>

        {/* How It Works Section */}
        <section className="bg-[#F2EFE6]/40 py-14 px-6 border-y border-[#D8E2E6]">
          <div className="max-w-6xl mx-auto space-y-10">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <h2 className="text-2xl font-bold text-[#243447]">How It Works</h2>
              <p className="text-xs text-[#667085]">A structured 5-step journey from onboarding to placement</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="bg-white p-5 rounded-lg border border-[#D8E2E6] space-y-2">
                <span className="text-xs font-bold text-[#66A3BF]">01</span>
                <h4 className="font-semibold text-sm text-[#243447]">Create Profile</h4>
                <p className="text-xs text-[#667085]">Fill in academic credentials, skills, and resume details.</p>
              </div>

              <div className="bg-white p-5 rounded-lg border border-[#D8E2E6] space-y-2">
                <span className="text-xs font-bold text-[#66A3BF]">02</span>
                <h4 className="font-semibold text-sm text-[#243447]">Find Internship</h4>
                <p className="text-xs text-[#667085]">Apply to vetted roles matching placement eligibility rules.</p>
              </div>

              <div className="bg-white p-5 rounded-lg border border-[#D8E2E6] space-y-2">
                <span className="text-xs font-bold text-[#66A3BF]">03</span>
                <h4 className="font-semibold text-sm text-[#243447]">Track Internship</h4>
                <p className="text-xs text-[#667085]">Submit weekly worklogs and verify daily attendance.</p>
              </div>

              <div className="bg-white p-5 rounded-lg border border-[#D8E2E6] space-y-2">
                <span className="text-xs font-bold text-[#66A3BF]">04</span>
                <h4 className="font-semibold text-sm text-[#243447]">Get Evaluated</h4>
                <p className="text-xs text-[#667085]">Receive feedback from both company and faculty mentors.</p>
              </div>

              <div className="bg-white p-5 rounded-lg border border-[#D8E2E6] space-y-2">
                <span className="text-xs font-bold text-[#66A3BF]">05</span>
                <h4 className="font-semibold text-sm text-[#243447]">Placement Ready</h4>
                <p className="text-xs text-[#667085]">Earn verified certificates and convert internships to PPOs.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Public Offer Verification Search Widget */}
        <section className="max-w-4xl mx-auto px-6 py-14">
          <div className="card-base bg-white p-8 text-center space-y-6">
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-full bg-[#E9F3FD] text-[#4874A0] flex items-center justify-center mx-auto">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-[#243447]">Public Offer Verification Tool</h3>
              <p className="text-xs text-[#667085] max-w-lg mx-auto">
                Verify authentic, T&P approved internship offer letters by entering the unique verification code issued by the institution.
              </p>
            </div>

            <form onSubmit={handleVerifySearch} className="flex flex-col sm:flex-row gap-2 max-w-xl mx-auto">
              <input
                type="text"
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value)}
                placeholder="e.g. OFFER-TECHCORP-2026-9981"
                className="input-base text-xs flex-1"
              />
              <button type="submit" disabled={searching} className="btn-primary text-xs whitespace-nowrap px-5">
                <Search className="w-4 h-4" />
                <span>{searching ? 'Verifying...' : 'Verify Offer'}</span>
              </button>
            </form>

            {errorMsg && (
              <div className="p-3 bg-[#C95A5A]/10 border border-[#C95A5A]/20 rounded-md text-[#C95A5A] text-xs max-w-xl mx-auto">
                {errorMsg}
              </div>
            )}

            {verifyResult && (
              <div className="p-5 bg-[#4F8A68]/10 border border-[#4F8A68]/30 rounded-lg text-left max-w-xl mx-auto space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#4F8A68] flex items-center space-x-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Authentic Verified Offer</span>
                  </span>
                  <StatusBadge status="VERIFIED" />
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs text-[#243447]">
                  <div><span className="text-[#667085] block">Candidate:</span> {verifyResult.studentName}</div>
                  <div><span className="text-[#667085] block">Company:</span> {verifyResult.companyName}</div>
                  <div><span className="text-[#667085] block">Role:</span> {verifyResult.roleTitle}</div>
                  <div><span className="text-[#667085] block">Stipend:</span> {verifyResult.stipend}</div>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-[#D8E2E6] px-6 py-8 text-center text-xs text-[#667085]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span>CareerLaunch &copy; 2026. Institutional Internship Management Platform.</span>
          <div className="flex space-x-6 text-[#667085]">
            <a href="#" className="hover:text-[#243447]">Privacy Policy</a>
            <a href="#" className="hover:text-[#243447]">Terms of Service</a>
            <a href="#" className="hover:text-[#243447]">Verification Portal</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

