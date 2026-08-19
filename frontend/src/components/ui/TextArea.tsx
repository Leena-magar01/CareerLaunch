import React from 'react';

export interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(({
  label,
  error,
  className = '',
  id,
  rows = 3,
  ...props
}, ref) => {
  const textAreaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="space-y-1.5 w-full">
      {label && (
        <label htmlFor={textAreaId} className="block text-xs font-semibold text-slate-300">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={textAreaId}
        rows={rows}
        className={`w-full bg-slate-900 border text-slate-100 placeholder-slate-500 rounded-xl text-xs p-3 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500/50 ${
          error ? 'border-rose-500' : 'border-slate-700/80 hover:border-slate-600 focus:border-cyan-500'
        } ${className}`}
        {...props}
      />
      {error && <p className="text-[11px] text-rose-400 font-medium">{error}</p>}
    </div>
  );
});

TextArea.displayName = 'TextArea';
