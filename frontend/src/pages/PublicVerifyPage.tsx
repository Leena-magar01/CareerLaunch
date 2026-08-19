import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ShieldCheck, CheckCircle2, XCircle, ArrowLeft } from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';

interface PublicVerifyPageProps {
  code: string;
  onNavigateHome: () => void;
}

export const PublicVerifyPage: React.FC<PublicVerifyPageProps> = ({ code, onNavigateHome }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchVerification = async () => {
      try {
        const res = await api.get(`/verify/offer/${code}`);
        if (res.data.success) {
          setData(res.data.data);
        }
      } catch (e: any) {
        setError(e.response?.data?.error?.message || 'Offer verification failed or invalid code.');
      } finally {
        setLoading(false);
      }
    };
    fetchVerification();
  }, [code]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
      <button
        onClick={onNavigateHome}
        className="fixed top-6 left-6 text-xs text-slate-400 hover:text-white flex items-center space-x-1.5"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Home</span>
      </button>

      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white">Public Verification Record</h2>
          <p className="text-xs text-slate-400">T&P Institutional Offer Verification</p>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 text-xs">Validating cryptographic verification code...</div>
        ) : error ? (
          <div className="glass-card p-6 border-rose-500/40 text-center space-y-3">
            <XCircle className="w-10 h-10 text-rose-400 mx-auto" />
            <h3 className="text-lg font-bold text-white">Verification Failed</h3>
            <p className="text-xs text-rose-300">{error}</p>
          </div>
        ) : (
          <div className="glass-card p-6 border-emerald-500/40 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="font-bold text-emerald-400 text-xs flex items-center space-x-1.5">
                <CheckCircle2 className="w-5 h-5" />
                <span>OFFICIAL VERIFIED OFFER</span>
              </span>
              <StatusBadge status="VERIFIED" />
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
                <span className="text-slate-500 text-[10px] block">Verification ID</span>
                <code className="text-cyan-400 font-mono font-bold">{data.verificationCode}</code>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div><span className="text-slate-500 block text-[10px]">Candidate</span> {data.studentName}</div>
                <div><span className="text-slate-500 block text-[10px]">Hiring Company</span> {data.companyName}</div>
                <div><span className="text-slate-500 block text-[10px]">Role Title</span> {data.roleTitle}</div>
                <div><span className="text-slate-500 block text-[10px]">Duration</span> {data.duration}</div>
                <div><span className="text-slate-500 block text-[10px]">Stipend</span> {data.stipend}</div>
                <div><span className="text-slate-500 block text-[10px]">Authority</span> {data.verifiedBy}</div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-500 text-center">
              Verified on institutional record. Privacy-protected anonymized output.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
