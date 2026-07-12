import React, { useState, type CSSProperties } from 'react';
import { MilestoneItem as Milestone, StatusType } from '@/lib/types';
import MilestoneCard from './MilestoneCard';
import { milestonesApi } from '@/lib/api';
import { useStore } from '@/store/useStore';
import { toast } from '@/store/useToast';
import { usePersistentState } from '@/lib/usePersistentState';
import { Lock } from 'lucide-react';
import { isMilestoneEffectivelyFinished, isMilestoneLocked } from '@/lib/milestoneGating';

interface MilestonesTimelineProps {
 milestones: Milestone[];
 goalId: string;
 onUpdate: (milestoneId: string, data: Partial<Milestone>) => void;
 onDelete: (milestoneId: string) => void;
 onAddTask: (milestoneId: string) => void;
 onQuickAddMilestone?: (title: string) => Promise<void> | void;
}

const statusStyle = (status: StatusType): CSSProperties => {
 const base = (tone: string): CSSProperties => ({
 background: tone,
 borderColor: tone,
 boxShadow: `0 8px 18px color-mix(in srgb, ${tone} 28%, transparent)`,
 });
 switch (status) {
 case StatusType.FINISHED:
 return base('var(--tn-good, #2f7d50)');
 case StatusType.IN_PROGRESS:
 return base('var(--tn-accent)');
 default:
 return base('var(--tn-fg-muted)');
 }
};

const MilestonesTimeline: React.FC<MilestonesTimelineProps> = ({
 milestones,
 goalId,
 onUpdate,
 onDelete,
 onAddTask,
 onQuickAddMilestone,
}) => {
 const reorderMilestonesInGoal = useStore((s) => s.reorderMilestonesInGoal);
 const [draggingId, setDraggingId] = useState<string | null>(null);
 const [dropTargetId, setDropTargetId] = useState<string | null>(null);
 const [quickDraft, setQuickDraft] = useState('');
 const [quickBusy, setQuickBusy] = useState(false);
 const [enforceSequential, setEnforceSequential] = usePersistentState('milestones:enforceSequential', false);

 const submitQuick = async (e: React.FormEvent) => {
 e.preventDefault();
 const title = quickDraft.trim();
 if (!title || !onQuickAddMilestone) return;
 setQuickBusy(true);
 try {
 await onQuickAddMilestone(title);
 setQuickDraft('');
 } finally {
 setQuickBusy(false);
 }
 };

 const persistReorder = async (orderedIds: string[]) => {
 const previous = milestones.map((m) => m.id);
 reorderMilestonesInGoal(goalId, orderedIds);
 try {
 await milestonesApi.reorder(orderedIds);
 } catch (err) {
 console.error('Failed to persist milestone order:', err);
 reorderMilestonesInGoal(goalId, previous);
 toast.error('Failed to save new order');
 }
 };

 const handleDrop = (targetId: string) => {
 setDropTargetId(null);
 if (!draggingId || draggingId === targetId) {
 setDraggingId(null);
 return;
 }
 const ids = milestones.map((m) => m.id);
 const fromIndex = ids.indexOf(draggingId);
 const toIndex = ids.indexOf(targetId);
 if (fromIndex < 0 || toIndex < 0) {
 setDraggingId(null);
 return;
 }
 const next = [...ids];
 next.splice(fromIndex, 1);
 next.splice(toIndex, 0, draggingId);
 setDraggingId(null);
 if (next.join(',') !== ids.join(',')) {
 persistReorder(next);
 }
 };

 if (!milestones || milestones.length === 0) {
 return (
 <div className="flex flex-col items-center justify-center py-16 px-4">
 <div className="w-20 h-20 bg-gradient-to-br from-gray-100 dark:from-gray-700 to-gray-200 dark:to-gray-800 rounded-full flex items-center justify-center mb-6">
 <svg className="w-10 h-10 text-muted-foreground dark:text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
 </svg>
 </div>
 <h3 className="text-xl font-semibold text-foreground mb-2">No Milestones Yet</h3>
 <p className="text-foreground dark:text-muted-foreground text-center max-w-md mb-6">
 Start breaking down your goal into manageable milestones to track your progress effectively.
 </p>
 {onQuickAddMilestone && (
 <form onSubmit={submitQuick} className="w-full max-w-md flex flex-col gap-2 sm:flex-row sm:items-center">
 <input
 type="text"
 value={quickDraft}
 onChange={(e) => setQuickDraft(e.target.value)}
 placeholder="First milestone…"
 disabled={quickBusy}
 className="filter-input w-full sm:flex-1 disabled:opacity-50"
 />
 <button
 type="submit"
 disabled={!quickDraft.trim() || quickBusy}
 className="btn btn-primary w-full sm:w-auto justify-center disabled:opacity-50"
 >
 Add
 </button>
 </form>
 )}
 </div>
 );
 }

 return (
 <div className="relative py-6 sm:py-8 max-w-full overflow-hidden">
 <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
 <div>
 <h2 className="text-2xl font-bold text-foreground mb-2">Milestones</h2>
 <p className="text-foreground dark:text-muted-foreground">Drag to reorder, click a card to expand.</p>
 </div>
 <button
 type="button"
 onClick={() => setEnforceSequential((value) => !value)}
 className="btn btn-secondary w-fit text-xs"
 style={enforceSequential ? {
 borderColor: 'var(--tn-accent)',
 color: 'var(--tn-accent)',
 background: 'color-mix(in srgb, var(--tn-accent) 10%, var(--tn-card))',
 } : undefined}
 title="When enabled, later milestones cannot be finished before earlier ones."
 >
 <Lock className="w-3.5 h-3.5" />
 <span>{enforceSequential ? 'Sequential on' : 'Free order'}</span>
 </button>
 </div>

 <div className="relative">
 <div className="absolute left-3 sm:left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-gray-200 dark:from-gray-600 via-gray-300 dark:via-gray-500 to-gray-200 dark:to-gray-600" />

 <div className="space-y-8">
 {milestones.map((milestone, idx) => {
 const isDragging = draggingId === milestone.id;
 const isDropTarget = dropTargetId === milestone.id && draggingId && draggingId !== milestone.id;
 // Sequential gating: a milestone is"locked" if any earlier
 // milestone in the chain is not yet finished. Surface visually,
 // but don't disable interaction outright — user can still expand
 // to plan ahead.
 const isEffectivelyFinished = isMilestoneEffectivelyFinished(milestone);
 const isLocked = isMilestoneLocked(milestones, idx, enforceSequential);
 return (
 <div
 key={milestone.id}
 draggable
 onDragStart={(e) => {
 setDraggingId(milestone.id);
 e.dataTransfer.effectAllowed = 'move';
 }}
 onDragEnd={() => {
 setDraggingId(null);
 setDropTargetId(null);
 }}
 onDragOver={(e) => {
 if (draggingId && draggingId !== milestone.id) {
 e.preventDefault();
 e.dataTransfer.dropEffect = 'move';
 setDropTargetId(milestone.id);
 }
 }}
 onDragLeave={() => {
 if (dropTargetId === milestone.id) setDropTargetId(null);
 }}
 onDrop={(e) => {
 e.preventDefault();
 handleDrop(milestone.id);
 }}
 className={`relative flex items-start group transition-opacity duration-200 min-w-0 ${
 isDragging ? 'opacity-40' : ''
 }`}
 style={{
 borderRadius: isDropTarget ? 'var(--tn-r-lg, 12px)' : undefined,
 boxShadow: isDropTarget ? '0 0 0 2px var(--tn-accent)' : undefined,
 }}
 >
 <div className="relative z-10 flex-shrink-0">
 <div className="flex items-center justify-center">
 <div
 className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border-4 shadow-lg transition-all duration-300 group-hover:scale-110 cursor-grab active:cursor-grabbing"
 style={statusStyle(isEffectivelyFinished ? StatusType.FINISHED : milestone.status)}
 title={`Milestone ${idx + 1}. Drag to reorder.`}
 />
 </div>
 <div className="absolute top-2.5 sm:top-3 left-5 sm:left-6 w-4 sm:w-8 h-0.5 bg-muted group-hover:bg-muted dark:group-hover:bg-muted transition-colors duration-300" />
 </div>

 <div className="flex-1 min-w-0 ml-4 sm:ml-6 transform transition-all duration-300 group-hover:translate-x-1">
 <div className={`bg-card dark:bg-card rounded-xl border shadow-sm hover:shadow-md transition-shadow duration-300 ${
 isLocked
 ? 'opacity-75'
 : 'border-border dark:border-border'
 }`}
 style={isLocked ? { borderColor: 'color-mix(in srgb, var(--tn-warn, #c8932a) 42%, var(--tn-card))' } : undefined}
 >
 {isLocked && (
 <div className="px-4 sm:px-6 pt-4 flex items-center gap-2 text-xs" style={{ color: 'var(--tn-warn, #c8932a)' }}>
 <Lock className="w-3 h-3" />
 <span>Finish previous milestones first to unlock progression</span>
 </div>
 )}
 <MilestoneCard
 milestone={milestone}
 goalId={goalId}
 onUpdate={(data) => {
 if (isLocked && data.status === StatusType.FINISHED) {
 toast.error('Finish previous milestones first');
 return;
 }
 onUpdate(milestone.id, data);
 }}
 onDelete={() => onDelete(milestone.id)}
 onAddTask={() => onAddTask(milestone.id)}
 />
 </div>
 </div>

 </div>
 );
 })}
 </div>

 <div className="mt-8 flex items-center justify-center">
 <div className="bg-muted dark:bg-card rounded-full px-4 py-2 flex items-center gap-2 max-w-full">
 <div className="w-2 h-2 rounded-full" style={{ background: 'var(--tn-good, #2f7d50)' }}></div>
 <span className="text-sm text-foreground dark:text-muted-foreground">
 {milestones.filter(isMilestoneEffectivelyFinished).length} of {milestones.length} completed
 </span>
 </div>
 </div>

 {onQuickAddMilestone && (
 <form onSubmit={submitQuick} className="mt-4 flex flex-col gap-2 max-w-xl mx-auto sm:flex-row sm:items-center">
 <input
 type="text"
 value={quickDraft}
 onChange={(e) => setQuickDraft(e.target.value)}
 placeholder="Quick add milestone…"
 disabled={quickBusy}
 className="filter-input w-full sm:flex-1 disabled:opacity-50"
 />
 <button
 type="submit"
 disabled={!quickDraft.trim() || quickBusy}
 className="btn btn-primary w-full sm:w-auto justify-center disabled:opacity-50"
 >
 Add
 </button>
 </form>
 )}
 </div>
 </div>
 );
};

export default MilestonesTimeline;
