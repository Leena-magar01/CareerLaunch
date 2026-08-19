import React from 'react';

export interface MetricCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: string;
  trendType?: 'positive' | 'negative' | 'neutral';
  color?: 'cyan' | 'indigo' | 'emerald' | 'amber' | 'rose';
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  icon,
  trend,
  trendType = 'positive',
  color = 'cyan'
}) => {
  const colorStyles = {
    cyan: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    indigo: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    rose: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
  };

  return (
    <div className="glass-card p-5 flex items-start justify-between">
      <div className="space-y-1">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">{label}</span>
        <span className="text-2xl font-black text-white block">{value}</span>
        {trend && (
          <span className={`text-[11px] font-semibold ${
            trendType === 'positive' ? 'text-emerald-400' : trendType === 'negative' ? 'text-rose-400' : 'text-slate-400'
          }`}>
            {trend}
          </span>
        )}
      </div>

      {icon && (
        <div className={`p-3 rounded-xl border ${colorStyles[color]}`}>
          {icon}
        </div>
      )}
    </div>
  );
};
