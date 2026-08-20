import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { GraduationCap, Building2, UserCheck, ShieldCheck, Lock, Mail, User, ArrowLeft } from 'lucide-react';

interface RegisterPageProps {
  onNavigateLogin: () => void;
  onNavigateHome: () => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onNavigateLogin, onNavigateHome }) => {
  const { login } = useAuth();
  const [role, setRole] = useState<'STUDENT' | 'COMPANY' | 'MENTOR' | 'TNP'>('STUDENT');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('CSE');
  const [passingYear, setPassingYear] = useState('2026');
  const [companyName, setCompanyName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);

    try {
      const res = await api.post('/auth/register', {
        email,
        password,
        role,
        fullName,
        department,
        passingYear,
        companyName
      });
      if (res.data.success) {
        login(res.data.data.token, res.data.data.user);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error?.message || 'Registration failed');
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

      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3.5 rounded-xl bg-[#E9F3FD] text-[#4874A0] border border-[#66A3BF]/30 mb-1">
            <GraduationCap className="w-7 h-7 text-[#66A3BF]" />
          </div>
          <h2 className="text-2xl font-bold text-[#243447] tracking-tight">Create New Account</h2>
          <p className="text-xs text-[#667085]">Join the institutional career discovery network</p>
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

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="card-base p-6 space-y-4 bg-white">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-[#C95A5A]/10 border border-[#C95A5A]/30 text-[#C95A5A] text-xs">
              {errorMsg}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#243447]">Full Name</label>
            <div className="relative">
              <User className="w-4 h-4 text-[#667085] absolute left-3 top-2.5" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                className="input-base text-xs !pl-9"
              />
            </div>
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

          {role === 'STUDENT' && (
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#243447]">Department</label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="input-base text-xs"
                >
                  <option value="CSE">CSE</option>
                  <option value="IT">IT</option>
                  <option value="ECE">ECE</option>
                  <option value="MECH">MECH</option>
                  <option value="CIVIL">CIVIL</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#243447]">Passing Year</label>
                <input
                  type="text"
                  value={passingYear}
                  onChange={(e) => setPassingYear(e.target.value)}
                  className="input-base text-xs"
                />
              </div>
            </div>
          )}

          {role === 'COMPANY' && (
            <div className="space-y-1 pt-1">
              <label className="text-xs font-semibold text-[#243447]">Company Name</label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-[#667085] absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="TechCorp Solutions Ltd."
                  className="input-base text-xs !pl-9"
                />
              </div>
            </div>
          )}

          <button type="submit" disabled={submitting} className="w-full btn-primary text-xs py-2.5 mt-3">
            {submitting ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-xs text-[#667085]">
          Already have an account?{' '}
          <button onClick={onNavigateLogin} className="text-[#66A3BF] font-semibold hover:underline">
            Sign in here
          </button>
        </p>
      </div>
    </div>
  );
};
