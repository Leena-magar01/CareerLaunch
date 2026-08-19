import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  hint,
  startIcon,
  endIcon,
  className = '',
  id,
  ...props
}, ref) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="space-y-1.5 w-full">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold text-slate-300">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {startIcon && (
          <div className="absolute left-3.5 text-slate-500 pointer-events-none">
            {startIcon}
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`w-full bg-slate-900 border text-slate-100 placeholder-slate-500 rounded-xl text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500/50 ${
            error ? 'border-rose-500 focus:border-rose-500' : 'border-slate-700/80 hover:border-slate-600 focus:border-cyan-500'
          } ${startIcon ? 'pl-10' : 'pl-3.5'} ${endIcon ? 'pr-10' : 'pr-3.5'} py-2.5 ${className}`}
          {...props}
        />
        {endIcon && (
          <div className="absolute right-3.5 text-slate-500">
            {endIcon}
          </div>
        )}
      </div>
      {error && <p className="text-[11px] text-rose-400 font-medium">{error}</p>}
      {hint && !error && <p className="text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
});

Input.displayName = 'Input';
