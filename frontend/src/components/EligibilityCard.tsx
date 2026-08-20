import React from 'react';
import { CheckCircle2, XCircle, AlertTriangle, ShieldCheck } from 'lucide-react';

interface EligibilityCardProps {
  result: {
    eligible: boolean;
    score: number;
    reasons: string[];
    passedRules: string[];
    failedRules: { rule: string; message: string; required: any; actual: any }[];
  };
  vacancyTitle?: string;
}

export const EligibilityCard: React.FC<EligibilityCardProps> = ({ result, vacancyTitle }) => {
  if (!result) return null;

  return (
    <div className={`p-5 rounded-2xl border transition-all ${
      result.eligible
        ? 'bg-emerald-50 border-emerald-200 text-slate-900 shadow-xs'
        : 'bg-rose-50 border-rose-200 text-slate-900 shadow-xs'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          {result.eligible ? (
            <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700 border border-emerald-300">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-rose-100 text-rose-700 border border-rose-300">
              <XCircle className="w-6 h-6" />
            </div>
          )}
          <div>
            <h4 className="font-bold text-base text-slate-900">
              {result.eligible ? 'Eligible for Internship' : 'Not Eligible'}
            </h4>
            {vacancyTitle && <p className="text-xs text-slate-600 font-medium">{vacancyTitle}</p>}
          </div>
        </div>

        <div className="text-right">
          <span className="text-2xl font-black text-slate-900">{result.score}%</span>
          <span className="block text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Rule Score</span>
        </div>
      </div>

      {/* Rule Itemization List */}
      <div className="mt-4 pt-4 border-t border-slate-200 space-y-2 text-xs">
        {result.passedRules.map((ruleText, idx) => (
          <div key={idx} className="flex items-center space-x-2 text-slate-800 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 text-emerald-600" />
            <span>{ruleText}</span>
          </div>
        ))}

        {result.failedRules.map((failed, idx) => (
          <div key={idx} className="flex items-start space-x-2 text-slate-800 font-medium bg-rose-100/60 p-2.5 rounded-xl border border-rose-200">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
            <div>
              <span className="font-bold uppercase text-[10px] text-rose-700 block">REQUIRED: {failed.rule}</span>
              <p className="text-slate-700 text-xs">{failed.message}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
