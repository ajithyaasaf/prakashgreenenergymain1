import { useState, useEffect } from 'react';

// Delayed spinner - only shows after a certain time to prevent flash of loading state for quick loads
export function DelayedSpinner({ delay = 300, size = 'medium' }: { delay?: number; size?: 'small' | 'medium' | 'large' }) {
  const [showSpinner, setShowSpinner] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSpinner(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  if (!showSpinner) return null;

  const sizeClasses = {
    small: 'w-5 h-5 border-2',
    medium: 'w-8 h-8 border-3',
    large: 'w-12 h-12 border-4',
  };

  return (
    <div className={`${sizeClasses[size]} border-primary border-t-transparent rounded-full animate-spin`}></div>
  );
}

// Skeletal loading component for pages
export function PageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-3/4 bg-slate-200 dark:bg-slate-700 rounded"></div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-slate-200 dark:bg-slate-700 rounded"></div>
        ))}
      </div>
      <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded"></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-48 bg-slate-200 dark:bg-slate-700 rounded"></div>
        ))}
      </div>
    </div>
  );
}

// Transition loading component with fade effects
export function TransitionLoading() {
  return (
    <div className="flex justify-center items-center h-full w-full min-h-[70vh] fade-in">
      <DelayedSpinner size="large" />
    </div>
  );
}

// Compact loading component for smaller areas
export function CompactLoading() {
  return (
    <div className="flex justify-center items-center py-4">
      <DelayedSpinner size="small" />
    </div>
  );
}

// Default export for backward compatibility
export default function Loading() {
  return (
    <div className="flex justify-center items-center h-full w-full min-h-[70vh]">
      <DelayedSpinner size="large" />
    </div>
  );
}