'use client';

import React, { useState, useEffect } from 'react';
import { withAuth } from '@/hoc/withAuth';
import { GoalItem as Goal, StatusType } from '@/lib/types';
import { useStore } from '@/store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { AuthRequiredError, goalsApi, metricDefinitionsApi, MetricDefinitionItem, trashApi } from '@/lib/api';
import { priorityWeight } from '@/lib/sort';
import { toast } from '@/store/useToast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { GridSkeleton } from '@/components/ui/Skeletons';
import { usePersistentState } from '@/lib/usePersistentState';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import { DropPlacement, moveIdRelative } from '@/lib/reorder';
import { buildGoalCardView } from '@/features/goals/goalCardView';
import Link from 'next/link';
import {
 Archive,
 ArrowRight,
 Check,
 CheckCircle2,
 CheckSquare2,
 Filter,
 GripVertical,
 MoreHorizontal,
 Plus,
 RotateCcw,
 Target,
 Trash2,
 X,
} from 'lucide-react';
import styles from './GoalsPage.module.css';

const GoalsPage: React.FC = () => {
 const [filterStatus, setFilterStatus] = usePersistentState<StatusType | 'all'>('goal:filter', 'all');
 const [sortBy, setSortBy] = usePersistentState<'custom' | 'title' | 'priority' | 'due'>('goal:sort', 'custom');
 const [isBulkWorking, setIsBulkWorking] = useState(false);
 const [search, setSearch] = useState('');
 const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
 const [selectionMode, setSelectionMode] = useState(false);
 const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
 const [showArchive, setShowArchive] = usePersistentState<boolean>('goal:showArchive', false);
 const [draggingGoalId, setDraggingGoalId] = useState<string | null>(null);
 const [dropTargetGoalId, setDropTargetGoalId] = useState<string | null>(null);
 const [dropTargetGoalPlacement, setDropTargetGoalPlacement] = useState<DropPlacement>('before');
 const [metricDefinitions, setMetricDefinitions] = useState<MetricDefinitionItem[]>([]);
 const [openMenuId, setOpenMenuId] = useState<string | null>(null);
 useDocumentTitle('Goals');

 const goals = useStore((s) => s.goals);
 const isLoadingGoals = useStore((s) => s.isLoadingGoals);
 const goalsError = useStore((s) => s.goalsError);
 const { fetchGoals, addGoal, deleteGoal: deleteGoalFromStore, updateGoal, reorderGoals } = useStore(
 useShallow((s) => ({
 fetchGoals: s.fetchGoals,
 addGoal: s.addGoal,
 deleteGoal: s.deleteGoal,
 updateGoal: s.updateGoal,
 reorderGoals: s.reorderGoals,
 }))
 );

 useEffect(() => {
 void fetchGoals({
 force: true,
 silent: useStore.getState().goals.length > 0,
 });
 }, [fetchGoals]);

 useEffect(() => {
 let cancelled = false;
 void metricDefinitionsApi.getAll()
 .then((rows) => {
 if (!cancelled) setMetricDefinitions(rows);
 })
 .catch((error) => {
 if (!(error instanceof AuthRequiredError)) console.error('Failed to load goal metric units:', error);
 });
 return () => { cancelled = true; };
 }, []);

 useEffect(() => {
 if (!openMenuId) return;
 const closeMenu = () => setOpenMenuId(null);
 document.addEventListener('pointerdown', closeMenu);
 return () => document.removeEventListener('pointerdown', closeMenu);
 }, [openMenuId]);

 useEffect(() => {
 const availableIds = new Set(goals.map((goal) => goal.id));
 setSelectedIds((current) => {
 const next = new Set(Array.from(current).filter((id) => availableIds.has(id)));
 return next.size === current.size ? current : next;
 });
 }, [goals]);

 useEffect(() => {
 if (!selectionMode) return;
 const leaveSelectionMode = (event: KeyboardEvent) => {
 if (event.key !== 'Escape') return;
 setSelectedIds(new Set());
 setSelectionMode(false);
 setOpenMenuId(null);
 };
 document.addEventListener('keydown', leaveSelectionMode);
 return () => document.removeEventListener('keydown', leaveSelectionMode);
 }, [selectionMode]);

 const softDeleteGoal = async (id: string) => {
 const goal = goals.find((g) => g.id === id);
 if (!goal) return;
 deleteGoalFromStore(id);
 try {
 await goalsApi.delete(id);
 } catch (err) {
 console.error('Soft-delete failed:', err);
 addGoal(goal);
 toast.error('Failed to delete goal — restored');
 return;
 }
 toast.withAction(
 'info',
 `"${goal.title}" deleted`,
 {
 label: 'Undo',
 run: async () => {
 try {
 await trashApi.restore('goal', id);
 addGoal(goal);
 } catch (err) {
 console.error('Goal restore failed:', err);
 toast.error('Failed to restore goal');
 }
 },
 },
 { ttlMs: 5000 }
 );
 };

 const toggleSelected = (id: string) => {
 if (isBulkWorking) return;
 setSelectionMode(true);
 setSelectedIds((prev) => {
 const next = new Set(prev);
 if (next.has(id)) next.delete(id);
 else next.add(id);
 return next;
 });
 };

 const leaveSelectionMode = () => {
 setSelectedIds(new Set());
 setSelectionMode(false);
 setOpenMenuId(null);
 };

 const performBulkStatusUpdate = async (
 ids: string[],
 status: StatusType,
 successVerb: 'Completed' | 'Archived' | 'Restored',
 ) => {
 if (ids.length === 0) return;
 setIsBulkWorking(true);
 const stamp = status === StatusType.IN_PROGRESS ? undefined : new Date().toISOString();
 const results = await Promise.allSettled(
 ids.map((id) => goalsApi.update({ id, status, end_datetime: stamp }))
 );
 const succeededIds = new Set<string>();
 const failedIds = new Set<string>();
 results.forEach((res, i) => {
 if (res.status === 'fulfilled') {
 updateGoal({
 ...res.value,
 ...(stamp && { end_datetime: res.value.end_datetime ?? stamp }),
 });
 succeededIds.add(ids[i]);
 } else {
 console.error(`Failed to update goal ${ids[i]}:`, res.reason);
 failedIds.add(ids[i]);
 }
 });
 setIsBulkWorking(false);
 const nextSelectedIds = new Set(Array.from(selectedIds).filter((id) => !succeededIds.has(id)));
 setSelectedIds(nextSelectedIds);
 if (nextSelectedIds.size === 0) setSelectionMode(false);
 if (succeededIds.size > 0) {
 toast.success(`${successVerb} ${succeededIds.size} goal${succeededIds.size === 1 ? '' : 's'}`);
 }
 if (failedIds.size > 0) {
 toast.error(`Failed to update ${failedIds.size} goal${failedIds.size === 1 ? '' : 's'}`);
 }
 };

 const performBulkDelete = async () => {
 if (selectedIds.size === 0) return;
 setIsBulkWorking(true);
 const ids = Array.from(selectedIds);
 const results = await Promise.allSettled(ids.map((id) => goalsApi.delete(id)));
 const succeededIds = new Set<string>();
 const failedIds = new Set<string>();
 results.forEach((res, i) => {
 if (res.status === 'fulfilled') {
 deleteGoalFromStore(ids[i]);
 succeededIds.add(ids[i]);
 } else {
 console.error(`Failed to delete goal ${ids[i]}:`, res.reason);
 failedIds.add(ids[i]);
 }
 });
 setIsBulkWorking(false);
 setConfirmBulkDelete(false);
 setSelectedIds(failedIds);
 if (failedIds.size === 0) setSelectionMode(false);
 if (succeededIds.size > 0) {
 toast.success(`Deleted ${succeededIds.size} goal${succeededIds.size === 1 ? '' : 's'}`);
 }
 if (failedIds.size > 0) {
 toast.error(`Failed to delete ${failedIds.size} goal${failedIds.size === 1 ? '' : 's'}`);
 }
 };

 const searchLower = search.trim().toLowerCase();
 const isArchived = (status: StatusType) =>
 status === StatusType.FINISHED || status === StatusType.CANCELLED;
 const visibleGoals = goals.filter((goal) => {
 // Hide archived (finished/cancelled) by default unless toggled or filter
 // explicitly targets one of those statuses.
 if (!showArchive && filterStatus === 'all' && isArchived(goal.status)) return false;
 if (filterStatus !== 'all' && goal.status !== filterStatus) return false;
 if (!searchLower) return true;
 return (
 goal.title.toLowerCase().includes(searchLower) ||
 (goal.description ?? '').toLowerCase().includes(searchLower)
 );
 });
 const archivedCount = goals.filter((g) => isArchived(g.status)).length;
 const filteredGoals = visibleGoals;
 const customOrderedGoals = goals
 .map((goal, index) => ({ goal, index }))
 .sort((a, b) => {
 const aPosition = a.goal.position ?? a.index + 1;
 const bPosition = b.goal.position ?? b.index + 1;
 return aPosition - bPosition || a.index - b.index;
 });
 const customOrderedIds = customOrderedGoals.map(({ goal }) => goal.id);
 const previewOrderedIds =
 sortBy === 'custom' && draggingGoalId && dropTargetGoalId
 ? moveIdRelative(customOrderedIds, draggingGoalId, dropTargetGoalId, dropTargetGoalPlacement)
 : customOrderedIds;

 const sortedGoals = [...filteredGoals].sort((a, b) => {
 switch (sortBy) {
 case 'custom':
 return previewOrderedIds.indexOf(a.id) - previewOrderedIds.indexOf(b.id);
 case 'title':
 return a.title.localeCompare(b.title);
 case 'priority':
 return priorityWeight(b.priority) - priorityWeight(a.priority);
 case 'due':
 return new Date(a.end_datetime || '').getTime() - new Date(b.end_datetime || '').getTime();
 default:
 return 0;
 }
 });

 const visibleGoalIds = sortedGoals.map((goal) => goal.id);
 const allVisibleSelected = visibleGoalIds.length > 0
 && visibleGoalIds.every((id) => selectedIds.has(id));
 const selectedGoals = goals.filter((goal) => selectedIds.has(goal.id));
 const activeSelectedIds = selectedGoals
 .filter((goal) => !isArchived(goal.status))
 .map((goal) => goal.id);
 const archivedSelectedIds = selectedGoals
 .filter((goal) => isArchived(goal.status))
 .map((goal) => goal.id);

 const toggleAllVisible = () => {
 if (isBulkWorking) return;
 setSelectedIds((current) => {
 const next = new Set(current);
 if (allVisibleSelected) visibleGoalIds.forEach((id) => next.delete(id));
 else visibleGoalIds.forEach((id) => next.add(id));
 return next;
 });
 };

 const persistGoalOrder = async (targetGoalId: string, placement: DropPlacement) => {
 if (!draggingGoalId || draggingGoalId === targetGoalId) return;
 const previousOrder = customOrderedIds;
 const nextOrder = moveIdRelative(previousOrder, draggingGoalId, targetGoalId, placement);
 if (nextOrder === previousOrder) return;
 reorderGoals(nextOrder);
 try {
 await goalsApi.reorder(nextOrder);
 } catch (error) {
 console.error('Failed to persist goal order:', error);
 reorderGoals(previousOrder);
 toast.error('Failed to save goal order');
 }
 };

 if (isLoadingGoals && goals.length === 0) {
 return (
 <div className="min-h-screen" style={{ background: 'var(--tn-bg)' }}>
 <main className="container mx-auto px-6 py-8">
 <GridSkeleton count={6} />
 </main>
 </div>
 );
 }

 return (
 <div className="page">
 {/* Page Header — themed via --tn-* tokens (responds to active theme) */}
 <div className="page-head page-head-row">
 <div>
 <div className="page-eyebrow">Workspace</div>
 <h1 className="page-title">Goals</h1>
 <p className="page-lede">Manage and track your long-term objectives.</p>
 </div>
 
 <div className="page-head-actions">
 <button
 type="button"
 onClick={() => selectionMode ? leaveSelectionMode() : setSelectionMode(true)}
 className="btn btn-secondary"
 aria-pressed={selectionMode}
 disabled={isBulkWorking}
 >
 {selectionMode ? <X className="w-4 h-4" /> : <CheckSquare2 className="w-4 h-4" />}
 <span>{selectionMode ? 'Done selecting' : 'Select'}</span>
 </button>
 <Link
 href="/goal/new"
 className="btn btn-primary page-cta"
 >
 <Plus className="w-4 h-4" />
 <span>Create Goal</span>
 </Link>
 </div>
 </div>

 {/* Filters and Sort */}
 <div className="filter-toolbar no-print">
 <input
 type="search"
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 placeholder="Search by title or description..."
 aria-label="Search goals"
 className="filter-input"
 />
 <div className="filter-actions">
 <Filter className="w-4 h-4 filter-icon" />
 <select
 value={filterStatus}
 onChange={(e) => setFilterStatus(e.target.value as StatusType | 'all')}
 className="filter-select"
 >
 <option value="all">All Status</option>
 <option value={StatusType.OUTSTANDING}>Outstanding</option>
 <option value={StatusType.IN_PROGRESS}>In Progress</option>
 <option value={StatusType.FINISHED}>Finished</option>
 </select>
 </div>

 <select
 value={sortBy}
 onChange={(e) => setSortBy(e.target.value as any)}
 className="filter-select"
 >
 <option value="custom">Custom order</option>
 <option value="title">Sort by Title</option>
 <option value="priority">Sort by Priority</option>
 <option value="due">Sort by Due Date</option>
 </select>

 {archivedCount > 0 && (
 <>
 <button
 onClick={() => setShowArchive(!showArchive)}
 className="btn btn-secondary"
 style={showArchive ? {
 borderColor: 'var(--tn-accent)',
 background: 'color-mix(in srgb, var(--tn-accent) 12%, var(--tn-card))',
 color: 'var(--tn-accent)',
 } : undefined}
 >
 {showArchive ? 'Hide archived' : `Show archived (${archivedCount})`}
 </button>
 <Link
 href="/goal/archive"
 className="btn btn-secondary"
 >
 Archive →
 </Link>
 </>
 )}
 </div>

 {selectionMode && (
 <section className={styles.bulkBar} aria-label="Bulk goal actions">
 <div className={styles.bulkSummary} aria-live="polite">
 <CheckSquare2 className="h-5 w-5" aria-hidden="true" />
 <strong>{selectedIds.size} selected</strong>
 {isBulkWorking && <span className={styles.bulkWorking}>Working…</span>}
 <button type="button" onClick={toggleAllVisible} disabled={visibleGoalIds.length === 0 || isBulkWorking}>
 {allVisibleSelected ? 'Deselect visible' : `Select all visible (${visibleGoalIds.length})`}
 </button>
 {selectedIds.size > 0 && (
 <button type="button" onClick={() => setSelectedIds(new Set())} disabled={isBulkWorking}>
 Clear
 </button>
 )}
 </div>
 <div className={styles.bulkActions}>
 {activeSelectedIds.length > 0 && (
 <>
 <button
 type="button"
 className="btn btn-secondary"
 disabled={isBulkWorking}
 onClick={() => void performBulkStatusUpdate(activeSelectedIds, StatusType.FINISHED, 'Completed')}
 >
 <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
 Mark done
 </button>
 <button
 type="button"
 className="btn btn-secondary"
 disabled={isBulkWorking}
 onClick={() => void performBulkStatusUpdate(activeSelectedIds, StatusType.CANCELLED, 'Archived')}
 >
 <Archive className="h-4 w-4" aria-hidden="true" />
 Archive
 </button>
 </>
 )}
 {archivedSelectedIds.length > 0 && (
 <button
 type="button"
 className="btn btn-secondary"
 disabled={isBulkWorking}
 onClick={() => void performBulkStatusUpdate(archivedSelectedIds, StatusType.IN_PROGRESS, 'Restored')}
 >
 <RotateCcw className="h-4 w-4" aria-hidden="true" />
 Restore
 </button>
 )}
 <button
 type="button"
 className="btn btn-danger"
 disabled={selectedIds.size === 0 || isBulkWorking}
 onClick={() => setConfirmBulkDelete(true)}
 >
 <Trash2 className="h-4 w-4" aria-hidden="true" />
 Delete
 </button>
 </div>
 </section>
 )}

 {/* Goals Grid */}
 {sortedGoals.length === 0 ? (
 <div className="card" style={{ textAlign: 'center', padding: 48 }}>
 <Target className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--tn-fg-muted)' }} />
 <h3 style={{ fontSize: 20, fontWeight: 600, color: 'var(--tn-fg)', marginBottom: 8, fontFamily: 'var(--tn-font-display, var(--tn-font-sans))' }}>No goals yet</h3>
 <p style={{ color: 'var(--tn-fg-muted)', marginBottom: 24 }}>Create your first goal to start building your roadmap.</p>
 <Link href="/goal/new" className="btn btn-primary">
 Create Your First Goal
 </Link>
 </div>
 ) : (
 <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
 {sortedGoals.map((goal) => {
 const isSelected = selectedIds.has(goal.id);
 const canDrag = sortBy === 'custom' && !selectionMode;
 const isDragging = draggingGoalId === goal.id;
 const isDropTarget = dropTargetGoalId === goal.id && draggingGoalId && draggingGoalId !== goal.id;
 const showDropMarker = isDragging && !!dropTargetGoalId && dropTargetGoalId !== goal.id;
 const card = buildGoalCardView(goal, metricDefinitions);
 const progressValue = card.progress.value ?? 0;
 return (
 <div key={goal.id} className="min-w-0">
 {showDropMarker && (
 <div className="mb-2 flex items-center gap-2 text-xs font-medium" style={{ color: 'var(--tn-accent)' }}>
 <span className="h-px flex-1 border-t-2 border-dashed" style={{ borderColor: 'var(--tn-accent)' }} />
 <span>Drop here</span>
 <span className="h-px flex-1 border-t-2 border-dashed" style={{ borderColor: 'var(--tn-accent)' }} />
 </div>
 )}
 <div
 draggable={canDrag}
 onDragStart={(e) => {
 if (!canDrag) return;
 e.dataTransfer.effectAllowed = 'move';
 e.dataTransfer.setData('application/x-tasknest-goal-id', goal.id);
 setDraggingGoalId(goal.id);
 }}
 onDragEnd={() => {
 setDraggingGoalId(null);
 setDropTargetGoalId(null);
 }}
 onDragOver={(e) => {
 if (!canDrag || !draggingGoalId || draggingGoalId === goal.id) return;
 e.preventDefault();
 const rect = e.currentTarget.getBoundingClientRect();
 const placement: DropPlacement = e.clientY > rect.top + rect.height / 2 ? 'after' : 'before';
 e.dataTransfer.dropEffect = 'move';
 setDropTargetGoalId(goal.id);
 setDropTargetGoalPlacement(placement);
 }}
 onDrop={async (e) => {
 if (!canDrag) return;
 e.preventDefault();
 await persistGoalOrder(goal.id, dropTargetGoalPlacement);
 setDraggingGoalId(null);
 setDropTargetGoalId(null);
 }}
 className={`goal-card ${styles.trackingCard} ${
 canDrag ? 'cursor-grab active:cursor-grabbing' : ''
 }`}
 data-dragging={isDragging}
 data-selected={isSelected}
 style={{
 borderColor: isDropTarget || isSelected ? 'var(--tn-accent)' : undefined,
 boxShadow: isDropTarget
 ? '0 0 0 3px color-mix(in srgb, var(--tn-accent) 24%, transparent)'
 : isSelected
 ? '0 0 0 2px color-mix(in srgb, var(--tn-accent) 22%, transparent)'
 : undefined,
 }}
 >
 {selectionMode && (
 <button
 type="button"
 className={styles.selectToggle}
 data-selected={isSelected}
 aria-pressed={isSelected}
 aria-label={`${isSelected ? 'Deselect' : 'Select'} ${goal.title}`}
 disabled={isBulkWorking}
 onClick={() => toggleSelected(goal.id)}
 >
 {isSelected && <Check className="h-4 w-4" aria-hidden="true" />}
 </button>
 )}
 {canDrag && (
 <button
 type="button"
 draggable={false}
 className={styles.dragHint}
 title="Drag to reorder"
 aria-label={`Drag ${goal.title} to reorder`}
 >
 <GripVertical
 className="h-4 w-4"
 style={{ color: 'var(--tn-fg-muted)' }}
 aria-hidden="true"
 />
 </button>
 )}

 <div
 className={styles.menuWrap}
 draggable={false}
 onPointerDown={(event) => event.stopPropagation()}
 >
 <button
 type="button"
 className={styles.menuButton}
 aria-label={`Actions for ${goal.title}`}
 aria-expanded={openMenuId === goal.id}
 onClick={(event) => {
 event.preventDefault();
 event.stopPropagation();
 setOpenMenuId((current) => current === goal.id ? null : goal.id);
 }}
 >
 <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
 </button>
 {openMenuId === goal.id && (
 <div className={styles.menu} role="menu">
 <button
 type="button"
 role="menuitem"
 className={styles.deleteAction}
 onClick={() => {
 setOpenMenuId(null);
 void softDeleteGoal(goal.id);
 }}
 >
 <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
 Delete goal
 </button>
 </div>
 )}
 </div>

 <Link
 href={`/goal/${goal.id}`}
 draggable={false}
 className={styles.cardLink}
 style={{ paddingLeft: canDrag || selectionMode ? 42 : undefined }}
 onClick={(event) => {
 if (!selectionMode) return;
 event.preventDefault();
 if (isBulkWorking) return;
 toggleSelected(goal.id);
 }}
 >
 <div className={styles.header}>
 <span className={`gc-ico ${card.visualTone} ${styles.identity}`} aria-hidden="true">
 {goal.title.trim().charAt(0) || 'G'}
 </span>
 <div className={styles.titleBlock}>
 <h3>{goal.title}</h3>
 {goal.description && (
 <p>{goal.description}</p>
 )}
 <div className={styles.statusRow}>
 <span className={styles.status} data-tone={card.statusTone}>{card.statusLabel}</span>
 {card.dueLabel && <span className={styles.due}>{card.dueLabel}</span>}
 <span className={styles.priority}>{goal.priority} priority</span>
 </div>
 </div>
 </div>

 <div className={styles.progressBlock}>
 <span className={styles.progressLabel}>{card.progress.label}</span>
 <div className={styles.progressTitle}>
 <strong>{card.progress.headline}</strong>
 {card.progress.value !== null && <b>{card.progress.value}%</b>}
 </div>
 {card.progress.detail && <p className={styles.progressDetail}>{card.progress.detail}</p>}
 <div
 className={styles.progressTrack}
 role="progressbar"
 aria-label={`${card.progress.label} for ${goal.title}`}
 aria-valuemin={0}
 aria-valuemax={100}
 aria-valuenow={card.progress.value ?? undefined}
 >
 <span
 className={styles.progressFill}
 style={{
 width: `${progressValue}%`,
 background: `var(--tn-${card.visualTone}, var(--tn-accent))`,
 }}
 />
 </div>
 {card.progress.lanes && (
 <div className={styles.lanes} aria-label="Progress by lane">
 {card.progress.lanes.map((lane) => (
 <div key={lane.label} className={styles.lane} title={`${lane.label}: ${lane.value ?? 'not configured'}${lane.value === null ? '' : '%'}`}>
 <span>{lane.label} {lane.value === null ? '—' : `${lane.value}%`}</span>
 <i style={{ '--lane-progress': `${lane.value ?? 0}%` } as React.CSSProperties} />
 </div>
 ))}
 </div>
 )}
 </div>

 <div className={styles.nextStep}>
 <div className={styles.nextCopy}>
 <span>Next</span>
 <strong>{card.nextStep.title}</strong>
 <small>{card.nextStep.context}</small>
 </div>
 <ArrowRight className={`h-4 w-4 ${styles.nextArrow}`} aria-hidden="true" />
 </div>
 </Link>
 </div>
 </div>
 );
 })}
 </div>
 )}

 <ConfirmDialog
 open={confirmBulkDelete}
 title={`Delete ${selectedIds.size} goal${selectedIds.size === 1 ? '' : 's'}`}
 description="All linked milestones, tasks, and todos under these goals will be moved to Trash, where they can be restored."
 destructive
 confirmLabel={`Delete ${selectedIds.size}`}
 busy={isBulkWorking}
 onConfirm={performBulkDelete}
 onCancel={() => !isBulkWorking && setConfirmBulkDelete(false)}
 />
 </div>
 );
};

export default withAuth(GoalsPage);
