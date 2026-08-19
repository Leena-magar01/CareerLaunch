import React from 'react';
import { Info, CheckCircle2, AlertTriangle, XCircle, X } from 'lucide-react';

export interface AlertProps {
  type?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  children: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({
  type = 'info',
  title,
  children,
  onClose,
  className = ''
}) => {
  const typeConfig = {
    info: {
      style: 'bg-cyan-950/30 border-cyan-500/30 text-cyan-200',
      icon: <Info className="w-5 h-5 text-cyan-400 flex-shrink-0" />
    },
    success: {
      style: 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
    },
    warning: {
      style: 'bg-amber-950/30 border-amber-500/30 text-amber-200',
      icon: <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
    },
    error: {
      style: 'bg-rose-950/30 border-rose-500/30 text-rose-200',
      icon: <XCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
    }
  };

  const current = typeConfig[type];

  return (
    <div className={`p-4 rounded-xl border flex items-start justify-between space-x-3 text-xs leading-relaxed ${current.style} ${className}`}>
      <div className="flex items-start space-x-3">
        {current.icon}
        <div>
          {title && <h5 className="font-bold text-white text-xs mb-0.5">{title}</h5>}
          <div>{children}</div>
        </div>
      </div>
      {onClose && (
        <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
