import React from 'react';
import { FolderOpen } from 'lucide-react';

export interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No records found',
  description = 'There are no items to display at this time.',
  icon,
  action
}) => {
  return (
    <div className="glass-card p-8 text-center flex flex-col items-center justify-center space-y-3 border-dashed border-slate-700/60">
      <div className="p-3 rounded-2xl bg-slate-800 text-slate-400 border border-slate-700">
        {icon || <FolderOpen className="w-8 h-8" />}
      </div>
      <div>
        <h4 className="font-bold text-white text-sm">{title}</h4>
        <p className="text-xs text-slate-400 mt-1 max-w-sm">{description}</p>
      </div>
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
};
