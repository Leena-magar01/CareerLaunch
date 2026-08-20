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
        return 'bg-slate-100 text-black border-slate-300';
      case 'SHORTLISTED':
      case 'UNDER_REVIEW':
      case 'ISSUED':
      case 'OPEN':
      case 'ACTIVE':
      case 'TNP_REVIEW':
        return 'bg-slate-100 text-black border-slate-300';
      case 'APPLIED':
      case 'PENDING':
      case 'SUBMITTED':
      case 'DRAFT':
      case 'UNDER_CONSIDERATION':
      case 'CORRECTION_REQUIRED':
      case 'CHANGES_REQUIRED':
      case 'NEEDS_ATTENTION':
        return 'bg-slate-100 text-black border-slate-300';
      case 'REJECTED':
      case 'DECLINED':
      case 'CLOSED':
      case 'CRITICAL':
      case 'WITHDRAWN':
        return 'bg-slate-100 text-black border-slate-300';
      default:
        return 'bg-slate-100 text-black border-slate-300';
    }
  };

  const pad = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-xs';

  return (
    <span className={`inline-flex items-center gap-1.5 font-bold rounded-full border ${getStyle(status)} ${pad}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-black"></span>
      {status ? status.replace(/_/g, ' ') : 'N/A'}
    </span>
  );
};
