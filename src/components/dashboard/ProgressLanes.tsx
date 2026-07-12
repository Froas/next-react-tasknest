import React from 'react';
import type { ProgressLane } from '@/lib/progress';

interface ProgressLanesProps {
 lanes: ProgressLane[];
 title?: string;
 className?: string;
}

const laneTone: Record<ProgressLane['id'], string> = {
 structural: 'var(--tn-accent)',
 outcome: 'var(--tn-good, #2f7d50)',
 consistency: 'var(--tn-warn, #c8932a)',
};

export const ProgressLanes: React.FC<ProgressLanesProps> = ({ lanes, title = 'Progress lanes', className = '' }) => (
 <section className={`rounded-2xl border p-4 ${className}`} style={{ border: 'var(--tn-line)', background: 'var(--tn-card)' }}>
 <div className="mb-3">
 <h2 className="text-sm font-semibold text-foreground">{title}</h2>
 <p className="text-xs text-muted-foreground">Structural work, measurable outcome, and recurring consistency stay separate.</p>
 </div>
 <div className="grid gap-3 md:grid-cols-3">
 {lanes.map((lane) => {
 const value = lane.value === null ? null : Math.max(0, Math.min(100, lane.value));
 const tone = laneTone[lane.id];
 return (
 <div key={lane.id} className="min-w-0 rounded-xl border p-3" style={{ borderColor: 'color-mix(in srgb, var(--tn-fg) 10%, transparent)', background: 'color-mix(in srgb, var(--tn-card) 92%, var(--tn-bg))' }}>
 <div className="mb-2 flex items-center justify-between gap-2">
 <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{lane.label}</span>
 <span className="text-sm font-semibold text-foreground">{value === null ? 'Not set' : `${Math.round(value)}%`}</span>
 </div>
 <div className="h-2 overflow-hidden rounded-full" style={{ background: 'var(--tn-bar-bg, rgba(0,0,0,.08))', border: 'var(--tn-line)' }}>
 {value !== null && <div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${value}%`, background: tone }} />}
 </div>
 <p className="mt-2 text-xs leading-snug text-muted-foreground">{lane.detail}</p>
 </div>
 );
 })}
 </div>
 </section>
);
