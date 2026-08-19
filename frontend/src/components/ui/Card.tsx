import React from 'react';

export interface CardProps {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'glass' | 'bordered';
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  action,
  children,
  className = '',
  variant = 'glass'
}) => {
  const variantStyles = {
    glass: 'bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 shadow-xl rounded-2xl',
    default: 'bg-slate-900 border border-slate-800 rounded-2xl shadow-md',
    bordered: 'bg-transparent border border-slate-700/80 rounded-2xl'
  };

  return (
    <div className={`${variantStyles[variant]} p-6 space-y-4 ${className}`}>
      {(title || subtitle || action) && (
        <div className="flex items-start justify-between border-b border-slate-700/50 pb-3">
          <div>
            {title && <h3 className="font-bold text-white text-base leading-snug">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div className="flex-shrink-0 ml-4">{action}</div>}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
};
