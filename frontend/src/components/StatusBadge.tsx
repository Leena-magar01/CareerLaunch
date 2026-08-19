import React from 'react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const getStyle = (st: string) => {
    switch (st?.toUpperCase()) {
      case 'VERIFIED':
      case 'APPROVED':
      case 'SELECTED':
      case 'COMPLETED':
      case 'ACCEPTED':
      case 'OFFERED':
      case 'ON_TRACK':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'SHORTLISTED':
      case 'UNDER_REVIEW':
      case 'ISSUED':
      case 'OPEN':
      case 'ACTIVE':
      case 'TNP_REVIEW':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
      case 'APPLIED':
      case 'PENDING':
      case 'SUBMITTED':
      case 'DRAFT':
      case 'UNDER_CONSIDERATION':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'REJECTED':
      case 'DECLINED':
      case 'CLOSED':
      case 'CRITICAL':
      case 'WITHDRAWN':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'CORRECTION_REQUIRED':
      case 'CHANGES_REQUIRED':
      case 'NEEDS_ATTENTION':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
      default:
        return 'bg-slate-700/40 text-slate-300 border-slate-600';
    }
  };

  const pad = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-xs';

  return (
    <span className={`inline-flex items-center gap-1.5 font-semibold rounded-full border ${getStyle(status)} ${pad}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
      {status ? status.replace(/_/g, ' ') : 'N/A'}
    </span>
  );
};
