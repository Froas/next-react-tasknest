import React, { type CSSProperties } from 'react';
import { GoalItem as Goal, StatusType, PriorityType } from '@/lib/types';
import { Markdown } from '@/components/ui/Markdown';
import { InlineDate, InlineSelect, InlineText } from '@/components/ui/InlineEdit';
import { useGoalGradientClass } from '@/lib/goalCover';
import { ProgressLane } from '@/lib/progress';

interface GoalHeaderCardProps {
 goal: Goal;
 progress: number;
 progressLanes?: ProgressLane[];
 onUpdate?: (data: Partial<Goal>) => void | Promise<void>;
}

const statusOptions = [
 StatusType.OUTSTANDING,
 StatusType.STARTED,
 StatusType.IN_PROGRESS,
 StatusType.FINISHED,
 StatusType.CLOSED,
 StatusType.ABORTED,
 StatusType.CANCELLED,
] as const;

const priorityOptions = [
 PriorityType.LOW,
 PriorityType.MEDIUM,
 PriorityType.HIGH,
] as const;

const tokenChip = (tone: string): CSSProperties => ({
 background: `color-mix(in srgb, ${tone} 12%, var(--tn-card))`,
 color: tone,
 borderColor: `color-mix(in srgb, ${tone} 38%, var(--tn-card))`,
});

const statusStyle = (status: StatusType): CSSProperties => {
 switch (status) {
 case StatusType.FINISHED:
 return tokenChip('var(--tn-good, #2f7d50)');
 case StatusType.IN_PROGRESS:
 return tokenChip('var(--tn-accent)');
 case StatusType.CANCELLED:
 return tokenChip('var(--tn-bad, #c25d63)');
 case StatusType.OUTSTANDING:
 default:
 return tokenChip('var(--tn-fg-muted)');
 }
};

const priorityStyle = (priority: PriorityType): CSSProperties => {
 switch (priority) {
 case PriorityType.HIGH:
 return tokenChip('var(--tn-bad, #c25d63)');
 case PriorityType.MEDIUM:
 return tokenChip('var(--tn-warn, #c8932a)');
 case PriorityType.LOW:
 return tokenChip('var(--tn-good, #2f7d50)');
 default:
 return tokenChip('var(--tn-fg-muted)');
 }
};

const GoalHeaderCard: React.FC<GoalHeaderCardProps> = ({ goal, progress, progressLanes, onUpdate }) => {
 const gradient = useGoalGradientClass(goal.id);
 const structuralProgress = progressLanes?.find((lane) => lane.id === 'structural')?.value ?? progress;
 const safeProgress = Math.max(0, Math.min(100, structuralProgress));
 const titleClass = 'text-2xl sm:text-3xl font-bold text-foreground mb-3 leading-tight break-words';
 const descriptionClass = 'text-foreground dark:text-muted-foreground/60 text-lg leading-relaxed max-w-4xl';
 const renderStatusBadge = (status: StatusType) => (
 <span
 className="inline-flex max-w-full px-3 sm:px-4 py-2 rounded-full text-sm font-medium border"
 style={statusStyle(status)}
 >
 <span className="flex items-center gap-2 min-w-0">
 <span className="w-2 h-2 rounded-full bg-current"></span>
 <span className="truncate">{status}</span>
 </span>
 </span>
 );
 const renderPriorityBadge = (priority: PriorityType) => (
 <span className="inline-flex max-w-full px-3 sm:px-4 py-2 rounded-full text-sm font-medium border" style={priorityStyle(priority)}>
 <span className="flex items-center gap-2 min-w-0">
 <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
 <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
 </svg>
 <span className="truncate">{priority}</span>
 </span>
 </span>
 );
 const renderStartDateBadge = (value?: string | null) => (
 <span className="inline-flex max-w-full px-3 sm:px-4 py-2 rounded-full text-sm border" style={tokenChip('var(--tn-accent)')}>
 <span className="flex items-center gap-2 min-w-0">
 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
 </svg>
 <span className="truncate">{value ? `Started: ${new Date(value).toLocaleDateString()}` : 'Add start date'}</span>
 </span>
 </span>
 );
 const renderDueDateBadge = (value?: string | null) => (
 <span className="inline-flex max-w-full px-3 sm:px-4 py-2 rounded-full text-sm border" style={tokenChip('var(--tn-warn, #c8932a)')}>
 <span className="flex items-center gap-2 min-w-0">
 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
 </svg>
 <span className="truncate">{value ? `Due: ${new Date(value).toLocaleDateString()}` : 'Add due date'}</span>
 </span>
 </span>
 );

 return (
 <div className="card mb-8 overflow-hidden max-w-full" style={{ padding: 0 }}>
 <div className={`h-2 bg-gradient-to-r ${gradient}`} />
 <div className="p-4 sm:p-6 lg:p-8">
 {/* Header section */}
 <div className="mb-6">
 {onUpdate ? (
 <InlineText
 value={goal.title}
 required
 ariaLabel="Edit goal title"
 className="-mx-2 px-2 py-1 mb-2"
 editClassName={titleClass}
 renderValue={(title) => <h1 className={titleClass}>{title}</h1>}
 onSave={(title) => onUpdate({ title })}
 />
 ) : (
 <h1 className={titleClass}>{goal.title}</h1>
 )}
 {onUpdate ? (
 <InlineText
 value={goal.description ?? ''}
 placeholder="Add a description..."
 multiline
 ariaLabel="Edit goal description"
 className="-mx-2 px-2 py-1"
 editClassName={descriptionClass}
 renderValue={(description) => (
 <Markdown
 source={description}
 className={descriptionClass}
 />
 )}
 onSave={(description) => onUpdate({ description })}
 />
 ) : goal.description && (
 <Markdown
 source={goal.description}
 className={descriptionClass}
 />
 )}
 </div>

 {/* Progress section */}
 <div className="mb-6">
 <div className="flex items-center justify-between gap-3 mb-3">
 <span className="text-foreground dark:text-muted-foreground/60 font-medium">Structural Progress</span>
 <span className="text-2xl font-bold text-foreground">{Math.round(safeProgress)}%</span>
 </div>
 
 {/* Progress bar */}
 <div className="relative">
 <div
 className="rounded-full h-3 overflow-hidden"
 style={{ background: 'var(--tn-bar-bg, rgba(0,0,0,.08))', border: 'var(--tn-line)' }}
 >
 <div
 className="h-full rounded-full transition-all duration-700 ease-out relative"
 style={{ width: `${safeProgress}%`, background: 'var(--tn-accent)' }}
 >
 {/* Animated shine effect */}
 <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 dark:via-white/10 to-transparent animate-pulse"></div>
 </div>
 </div>
 
 {/* Progress milestones */}
 <div className="flex justify-between mt-2 text-xs text-foreground dark:text-muted-foreground/60">
 <span>0%</span>
 <span>25%</span>
 <span>50%</span>
 <span>75%</span>
 <span>100%</span>
 </div>
 </div>
 {progressLanes && progressLanes.length > 0 && (
 <div className="mt-4 grid gap-2 sm:grid-cols-3">
 {progressLanes.map((lane) => (
 <div
 key={lane.id}
 className="rounded-xl border p-3"
 style={{
 background: 'color-mix(in srgb, var(--tn-card) 92%, var(--tn-bg))',
 borderColor: 'color-mix(in srgb, var(--tn-fg) 10%, transparent)',
 }}
 >
 <div className="flex items-center justify-between gap-2">
 <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground dark:text-muted-foreground">
 {lane.label}
 </span>
 <span className="text-sm font-semibold text-foreground">
 {lane.value === null ? 'Not set' : `${Math.round(Math.max(0, Math.min(100, lane.value)))}%`}
 </span>
 </div>
 <p className="mt-1 text-xs leading-snug text-muted-foreground dark:text-muted-foreground">{lane.detail}</p>
 </div>
 ))}
 </div>
 )}
 </div>

 {/* Status badges and dates */}
 <div className="flex flex-wrap gap-2 sm:gap-3 items-center max-w-full">
 {/* Status badge */}
 {onUpdate ? (
 <InlineSelect
 value={goal.status}
 options={statusOptions}
 ariaLabel="Edit goal status"
 renderValue={renderStatusBadge}
 onSave={(status) => onUpdate({ status })}
 />
 ) : renderStatusBadge(goal.status)}

 {/* Priority badge */}
 {onUpdate ? (
 <InlineSelect
 value={goal.priority}
 options={priorityOptions}
 ariaLabel="Edit goal priority"
 renderValue={renderPriorityBadge}
 onSave={(priority) => onUpdate({ priority })}
 />
 ) : renderPriorityBadge(goal.priority)}

 {/* Date badges */}
 {onUpdate ? (
 <>
 <InlineDate
 value={goal.start_datetime}
 ariaLabel="Edit goal start date"
 renderValue={renderStartDateBadge}
 toPayload={(date) => new Date(date).toISOString()}
 onSave={(start_datetime) => onUpdate({ start_datetime })}
 />
 <InlineDate
 value={goal.end_datetime}
 ariaLabel="Edit goal due date"
 renderValue={renderDueDateBadge}
 toPayload={(date) => new Date(date).toISOString()}
 onSave={(end_datetime) => onUpdate({ end_datetime })}
 />
 </>
 ) : (
 <>
 {goal.start_datetime && renderStartDateBadge(goal.start_datetime)}
 {goal.end_datetime && renderDueDateBadge(goal.end_datetime)}
 </>
 )}
 </div>

 {/* Statistics row */}
 <div className="mt-6 pt-6 border-t border-border dark:border-border">
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
 <div className="text-center">
 <div className="text-2xl font-bold text-foreground mb-1">
 {goal.milestones?.length || 0}
 </div>
 <div className="text-sm text-foreground dark:text-muted-foreground">Total Milestones</div>
 </div>
 <div className="text-center">
 <div className="text-2xl font-bold mb-1" style={{ color: 'var(--tn-good, #2f7d50)' }}>
 {goal.milestones?.filter(m => m.status === StatusType.FINISHED).length || 0}
 </div>
 <div className="text-sm text-foreground dark:text-muted-foreground">Completed</div>
 </div>
 <div className="text-center">
 <div className="text-2xl font-bold mb-1" style={{ color: 'var(--tn-accent)' }}>
 {goal.milestones?.filter(m => m.status === StatusType.IN_PROGRESS).length || 0}
 </div>
 <div className="text-sm text-foreground dark:text-muted-foreground">In Progress</div>
 </div>
 <div className="text-center">
 <div className="text-2xl font-bold mb-1" style={{ color: 'var(--tn-warn, #c8932a)' }}>
 {goal.milestones?.filter(m => m.status === StatusType.OUTSTANDING).length || 0}
 </div>
 <div className="text-sm text-foreground dark:text-muted-foreground">Pending</div>
 </div>
 </div>
 </div>
 </div>
 </div>
 );
};

export default GoalHeaderCard;
