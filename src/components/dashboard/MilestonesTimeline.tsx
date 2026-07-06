import React, { useState } from 'react';
import { MilestoneItem as Milestone, StatusType } from '@/lib/types';
import MilestoneCard from './MilestoneCard';
import { milestonesApi } from '@/lib/api';
import { useStore } from '@/store/useStore';
import { toast } from '@/store/useToast';
import { Lock } from 'lucide-react';

interface MilestonesTimelineProps {
 milestones: Milestone[];
 goalId: string;
 onUpdate: (milestoneId: string, data: Partial<Milestone>) => void;
 onDelete: (milestoneId: string) => void;
 onAddTask: (milestoneId: string) => void;
 onQuickAddMilestone?: (title: string) => Promise<void> | void;
}

const statusColor = (status: StatusType) => {
 switch (status) {
 case StatusType.FINISHED:
 return 'bg-emerald-500 border-emerald-500 shadow-emerald-500/30';
 case StatusType.IN_PROGRESS:
 return 'bg-blue-500 border-blue-500 shadow-blue-500/30';
 default:
 return 'bg-slate-400 border-slate-400 shadow-slate-400/30';
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
 <form onSubmit={submitQuick} className="w-full max-w-md flex items-center space-x-2">
 <input
 type="text"
 value={quickDraft}
 onChange={(e) => setQuickDraft(e.target.value)}
 placeholder="First milestone…"
 disabled={quickBusy}
 className="flex-1 px-3 py-2 text-sm border border-border dark:border-border bg-card dark:bg-card text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
 />
 <button
 type="submit"
 disabled={!quickDraft.trim() || quickBusy}
 className="px-3 py-2 text-sm bg-card dark:bg-card text-white rounded-lg hover:bg-card dark:hover:bg-muted disabled:opacity-50"
 >
 Add
 </button>
 </form>
 )}
 </div>
 );
 }

 return (
 <div className="relative py-8">
 <div className="mb-8">
 <h2 className="text-2xl font-bold text-foreground mb-2">Milestones</h2>
 <p className="text-foreground dark:text-muted-foreground">Drag to reorder, click a card to expand.</p>
 </div>

 <div className="relative">
 <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-gray-200 dark:from-gray-600 via-gray-300 dark:via-gray-500 to-gray-200 dark:to-gray-600" />

 <div className="space-y-8">
 {milestones.map((milestone, idx) => {
 const isDragging = draggingId === milestone.id;
 const isDropTarget = dropTargetId === milestone.id && draggingId && draggingId !== milestone.id;
 // Sequential gating: a milestone is"locked" if any earlier
 // milestone in the chain is not yet finished. Surface visually,
 // but don't disable interaction outright — user can still expand
 // to plan ahead.
 const previousFinished = milestones
 .slice(0, idx)
 .every((m) => m.status === StatusType.FINISHED);
 const isLocked = !previousFinished && milestone.status !== StatusType.FINISHED;
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
 className={`relative flex items-start group transition-opacity duration-200 ${
 isDragging ? 'opacity-40' : ''
 } ${isDropTarget ? 'ring-2 ring-blue-400 rounded-xl' : ''}`}
 >
 <div className="relative z-10 flex-shrink-0">
 <div className="flex items-center justify-center">
 <div
 className={`w-6 h-6 rounded-full border-4 ${statusColor(milestone.status)}
 shadow-lg transition-all duration-300 group-hover:scale-110`}
 />
 </div>
 <div className="absolute top-3 left-6 w-8 h-0.5 bg-muted group-hover:bg-muted dark:group-hover:bg-muted transition-colors duration-300" />
 </div>

 <div className="flex-1 ml-6 transform transition-all duration-300 group-hover:translate-x-1">
 <div className={`bg-card dark:bg-card rounded-xl border shadow-sm hover:shadow-md transition-shadow duration-300 ${
 isLocked
 ? 'border-amber-200 dark:border-amber-800 opacity-75'
 : 'border-border dark:border-border'
 }`}>
 {isLocked && (
 <div className="px-6 pt-4 flex items-center space-x-2 text-xs text-amber-700 dark:text-amber-300">
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

 <div
 className="absolute -left-2 -top-2 w-6 h-6 bg-card dark:bg-muted text-white dark:text-foreground text-xs font-bold rounded-full flex items-center justify-center shadow-lg cursor-grab active:cursor-grabbing"
 title="Drag to reorder"
 >
 {idx + 1}
 </div>
 </div>
 );
 })}
 </div>

 <div className="mt-8 flex items-center justify-center">
 <div className="bg-muted dark:bg-card rounded-full px-4 py-2 flex items-center space-x-2">
 <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
 <span className="text-sm text-foreground dark:text-muted-foreground">
 {milestones.filter((m) => m.status === StatusType.FINISHED).length} of {milestones.length} completed
 </span>
 </div>
 </div>

 {onQuickAddMilestone && (
 <form onSubmit={submitQuick} className="mt-4 flex items-center space-x-2 max-w-xl mx-auto">
 <input
 type="text"
 value={quickDraft}
 onChange={(e) => setQuickDraft(e.target.value)}
 placeholder="Quick add milestone…"
 disabled={quickBusy}
 className="flex-1 px-3 py-2 text-sm border border-border dark:border-border bg-card dark:bg-card text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
 />
 <button
 type="submit"
 disabled={!quickDraft.trim() || quickBusy}
 className="px-3 py-2 text-sm bg-card dark:bg-card text-white rounded-lg hover:bg-card dark:hover:bg-muted disabled:opacity-50"
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
