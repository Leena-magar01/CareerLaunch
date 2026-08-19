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
        ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-100 shadow-lg shadow-emerald-950/40'
        : 'bg-rose-950/20 border-rose-500/30 text-rose-100 shadow-lg shadow-rose-950/40'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          {result.eligible ? (
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/40">
              <XCircle className="w-6 h-6" />
            </div>
          )}
          <div>
            <h4 className="font-bold text-base">
              {result.eligible ? 'Eligible for Internship' : 'Not Eligible'}
            </h4>
            {vacancyTitle && <p className="text-xs text-slate-400 font-medium">{vacancyTitle}</p>}
          </div>
        </div>

        <div className="text-right">
          <span className="text-2xl font-black text-white">{result.score}%</span>
          <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Rule Score</span>
        </div>
      </div>

      {/* Rule Itemization List */}
      <div className="mt-4 pt-4 border-t border-slate-800/60 space-y-2 text-xs">
        {result.passedRules.map((ruleText, idx) => (
          <div key={idx} className="flex items-center space-x-2 text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{ruleText}</span>
          </div>
        ))}

        {result.failedRules.map((failed, idx) => (
          <div key={idx} className="flex items-start space-x-2 text-rose-400 bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block">{failed.rule.replace(/_/g, ' ')}:</span>
              <span className="text-rose-300 text-[11px]">{failed.message}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
