import React, { useState } from 'react';
import { Award, ShieldCheck, CheckCircle2, Download, Printer, X, Copy, Check, ExternalLink, GraduationCap, Building2 } from 'lucide-react';

interface CertificateModalProps {
  certificate: any;
  student: any;
  onClose: () => void;
}

export const CertificateModal: React.FC<CertificateModalProps> = ({ certificate, student, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!certificate) return null;

  const studentName = student?.fullName || certificate.studentName || 'Student Intern';
  const studentCode = student?.studentCode || certificate.studentCode || 'STU-2026';
  const department = student?.department || certificate.department || 'Computer Science & Engineering';
  const companyName = certificate.internship?.company?.name || certificate.companyName || 'Host Organization';
  const internshipTitle = certificate.internship?.title || certificate.internshipTitle || 'Software Engineering Internship';
  const duration = certificate.internship?.durationMonths || certificate.durationMonths || 6;
  const grade = certificate.grade || 'A+ (Outstanding)';
  const finalScore = certificate.finalScore || 9.2;
  const certId = certificate.certificateId || certificate.verificationCode || 'CERT-2026-001';
  const completionDate = certificate.completionDate
    ? new Date(certificate.completionDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const handleCopyCode = () => {
    navigator.clipboard.writeText(certId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white">
      <div className="relative w-full max-w-4xl bg-white text-slate-900 rounded-2xl shadow-2xl overflow-hidden my-8 print:my-0 print:shadow-none print:w-full print:max-w-none">
        
        {/* Action Header Bar (Hidden during print) */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white print:hidden">
          <div className="flex items-center space-x-2">
            <Award className="w-5 h-5 text-amber-400" />
            <span className="font-bold text-sm">Verified Institutional Certificate</span>
            <span className="text-[11px] bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded border border-amber-400/30 font-mono">
              {certId}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopyCode}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 transition-colors border border-slate-700"
              title="Copy Certificate ID"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied ID' : 'Copy ID'}</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-xs font-semibold text-white transition-colors shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Certificate Printable Canvas */}
        <div className="p-8 sm:p-12 bg-[#FDFBF7] print:p-8 relative border-8 border-[#1E293B]">
          {/* Inner Decorative Border */}
          <div className="border-2 border-amber-600/40 p-8 sm:p-12 relative bg-white shadow-inner">
            
            {/* Watermark Logo in background */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none">
              <GraduationCap className="w-96 h-96 text-slate-900" />
            </div>

            {/* Top Institutional Header */}
            <div className="text-center space-y-2 border-b border-amber-600/20 pb-6">
              <div className="inline-flex items-center justify-center p-3 rounded-full bg-slate-900 text-amber-400 shadow-md mb-2">
                <GraduationCap className="w-8 h-8" />
              </div>
              <p className="text-xs uppercase tracking-[0.25em] font-bold text-slate-500">
                Autonomous Institutional Placement & Academic Governance
              </p>
              <h1 className="text-2xl sm:text-3xl font-serif font-black tracking-wide text-slate-900 uppercase">
                Certificate of Internship Completion
              </h1>
              <p className="text-xs italic text-slate-600">
                Official Credential &bull; Training & Placement (T&P) Department
              </p>
            </div>

            {/* Certificate Body Text */}
            <div className="text-center my-8 space-y-5">
              <p className="text-xs uppercase tracking-widest text-slate-500 font-semibold">
                This credential is proudly awarded to
              </p>

              <div className="space-y-1">
                <h2 className="text-2xl sm:text-3xl font-serif font-black text-cyan-900 tracking-tight border-b-2 border-amber-400/60 inline-block pb-1 px-6">
                  {studentName}
                </h2>
                <p className="text-xs font-mono text-slate-600 font-semibold pt-1">
                  Student ID: {studentCode} &bull; Dept. of {department}
                </p>
              </div>

              <p className="text-sm leading-relaxed text-slate-700 max-w-2xl mx-auto pt-2">
                for outstanding dedication, technical proficiency, and the successful completion of an official industry internship program as
              </p>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 max-w-xl mx-auto shadow-sm space-y-1">
                <p className="text-base font-extrabold text-slate-900 tracking-tight">
                  {internshipTitle}
                </p>
                <p className="text-xs text-slate-600 font-medium flex items-center justify-center space-x-1">
                  <Building2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>Hosted by <strong>{companyName}</strong> &bull; Duration: <strong>{duration} Months</strong></span>
                </p>
              </div>

              {/* Performance Evaluation Rubric Highlight */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-lg mx-auto text-center pt-2">
                <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-lg">
                  <span className="text-[10px] uppercase font-bold text-amber-800 tracking-wider block">Evaluated Grade</span>
                  <span className="text-sm font-black text-amber-900">{grade}</span>
                </div>
                <div className="p-3 bg-cyan-50/60 border border-cyan-200 rounded-lg">
                  <span className="text-[10px] uppercase font-bold text-cyan-800 tracking-wider block">Performance Score</span>
                  <span className="text-sm font-black text-cyan-900">{finalScore} / 10.0</span>
                </div>
                <div className="col-span-2 sm:col-span-1 p-3 bg-emerald-50/60 border border-emerald-200 rounded-lg">
                  <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider block">T&P Verification</span>
                  <span className="text-xs font-bold text-emerald-900 flex items-center justify-center space-x-1 mt-0.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Approved</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Signatures & Security Footer */}
            <div className="border-t border-amber-600/20 pt-8 mt-8">
              <div className="grid grid-cols-3 gap-4 text-center items-end text-xs">
                
                {/* Mentor Signature */}
                <div className="space-y-1">
                  <div className="h-9 flex items-center justify-center">
                    <span className="font-serif italic text-base text-slate-700 font-semibold">Dr. Rajesh Verma</span>
                  </div>
                  <div className="border-t border-slate-400 pt-1">
                    <p className="font-bold text-slate-800 text-[11px]">Faculty Mentor</p>
                    <p className="text-[10px] text-slate-500">Academic Reviewer</p>
                  </div>
                </div>

                {/* Verification Badge Seal in Middle */}
                <div className="flex flex-col items-center justify-center space-y-1">
                  <div className="w-14 h-14 rounded-full border-2 border-amber-500/80 bg-amber-50 flex items-center justify-center shadow-inner">
                    <ShieldCheck className="w-8 h-8 text-amber-600" />
                  </div>
                  <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest">
                    AICTE Verified
                  </span>
                </div>

                {/* T&P Officer Signature */}
                <div className="space-y-1">
                  <div className="h-9 flex items-center justify-center">
                    <span className="font-serif italic text-base text-slate-700 font-semibold">T&P Directorate</span>
                  </div>
                  <div className="border-t border-slate-400 pt-1">
                    <p className="font-bold text-slate-800 text-[11px]">Training & Placement Cell</p>
                    <p className="text-[10px] text-slate-500">Institutional Authority</p>
                  </div>
                </div>
              </div>

              {/* Bottom Metadata bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between text-[10px] text-slate-500 pt-6 mt-6 border-t border-slate-100 gap-2">
                <div>
                  <span>Date of Issuance: <strong>{completionDate}</strong></span>
                </div>
                <div className="font-mono text-center">
                  <span>Tamper-Proof Code: <strong className="text-slate-800">{certId}</strong></span>
                </div>
                <div className="flex items-center space-x-1 text-emerald-700 font-medium">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Officially Verified & Recorded</span>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
