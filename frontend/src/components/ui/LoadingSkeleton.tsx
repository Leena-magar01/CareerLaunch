import React from 'react';

export interface LoadingSkeletonProps {
  lines?: number;
  height?: string;
  className?: string;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  lines = 3,
  height = 'h-4',
  className = ''
}) => {
  return (
    <div className="space-y-2.5 w-full animate-pulse">
      {Array.from({ length: lines }).map((_, idx) => (
        <div
          key={idx}
          className={`${height} bg-slate-800/80 rounded-lg w-full ${
            idx === lines - 1 && lines > 1 ? 'w-2/3' : ''
          } ${className}`}
        />
      ))}
    </div>
  );
};
