import React from 'react';

export const Pulse: React.FC<{ className?: string }> = ({ className = '' }) => (
 <div className={`animate-pulse bg-muted dark:bg-card rounded ${className}`} />
);

export const GoalCardSkeleton: React.FC = () => (
 <div className="card">
 <div className="flex justify-between items-start mb-4">
 <Pulse className="h-5 w-2/3" />
 <Pulse className="h-5 w-16" />
 </div>
 <Pulse className="h-3 w-full mb-2" />
 <Pulse className="h-3 w-3/4 mb-4" />
 <Pulse className="h-2 w-full mb-4" />
 <Pulse className="h-3 w-1/3" />
 </div>
);

export const GoalListSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => (
 <div className="space-y-6">
 {Array.from({ length: count }).map((_, i) => (
 <GoalCardSkeleton key={i} />
 ))}
 </div>
);

export const GridCardSkeleton: React.FC = () => (
 <div className="bg-card dark:bg-card rounded-lg border border-border dark:border-border p-6">
 <Pulse className="h-5 w-3/4 mb-3" />
 <Pulse className="h-3 w-full mb-2" />
 <Pulse className="h-3 w-2/3 mb-4" />
 <div className="flex space-x-2 mb-4">
 <Pulse className="h-5 w-16" />
 <Pulse className="h-5 w-16" />
 </div>
 <Pulse className="h-3 w-1/3" />
 </div>
);

export const GridSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => (
 <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
 {Array.from({ length: count }).map((_, i) => (
 <GridCardSkeleton key={i} />
 ))}
 </div>
);
