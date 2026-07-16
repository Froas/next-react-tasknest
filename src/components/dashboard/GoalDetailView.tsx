'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { GoalItem as Goal, MilestoneItem as Milestone, StatusType, PriorityType, TaskItem as Task, Event, TodoItem as Todo, SubtaskItem as Subtask } from '@/lib/types';
import { MilestoneForm } from './MilestoneForm';
import { TaskForm } from './TaskForm';
import { ActionForm, ActionKind } from './ActionForm';
import { milestonesApi, eventsApi, goalsApi } from '@/lib/api';
import { useStore } from '@/store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { calculateGoalProgress, calculateGoalProgressLanes } from '@/lib/progress';
import { toast } from '@/store/useToast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import GoalHeaderCard from './GoalHeaderCard';
import MilestonesTimeline from './MilestonesTimeline';
import { GoalMetricsPanel } from './GoalMetricsPanel';
import { GoalCompletionRulePanel } from './GoalCompletionRulePanel';
import { JourneyThemeSelector } from '@/components/visualization/JourneyThemeSelector';
import { formatDate, stripMarkdown } from '@/lib/utils';
import { STATUS_LABELS } from '@/lib/sort';

interface GoalDetailViewProps {
 goal: Goal;
 onBack: () => void;
 onDelete: () => void | Promise<void>;
 selectedMilestoneId?: string | null;
}

export const GoalDetailView: React.FC<GoalDetailViewProps> = ({
 goal,
 onBack,
 onDelete,
 selectedMilestoneId: initialMilestoneId,
}) => {
 const [isCreatingMilestone, setIsCreatingMilestone] = useState(false);
 const [isCreatingTask, setIsCreatingTask] = useState(false);
 const [taskFormMode, setTaskFormMode] = useState<'task' | 'routine'>('task');
 const [selectedRoutineTaskId, setSelectedRoutineTaskId] = useState<string | null>(null);
 const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(initialMilestoneId ?? null);
 const [isSyncingCalendar, setIsSyncingCalendar] = useState(false);
 const [isLoading, setIsLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);

 const [showDeleteGoalConfirm, setShowDeleteGoalConfirm] = useState(false);
 const [isDeleting, setIsDeleting] = useState(false);

 // Subscribe only to the specific goal from the store — unrelated goals
 // changing won't re-render this view.
 const currentGoal = useStore((s) => s.goals.find((g) => g.id === goal.id) ?? goal);
 const {
 updateGoal,
 addTaskToMilestoneInGoal,
 updateTaskInGoals,
 updateTodoInGoals,
 updateSubtaskInGoals,
 addMilestoneToGoal,
 addEvents,
 updateMilestoneInGoals,
 deleteMilestoneFromGoals,
 } = useStore(
 useShallow((s) => ({
 updateGoal: s.updateGoal,
 addTaskToMilestoneInGoal: s.addTaskToMilestoneInGoal,
 updateTaskInGoals: s.updateTaskInGoals,
 updateTodoInGoals: s.updateTodoInGoals,
 updateSubtaskInGoals: s.updateSubtaskInGoals,
 addMilestoneToGoal: s.addMilestoneToGoal,
 addEvents: s.addEvents,
 updateMilestoneInGoals: s.updateMilestoneInGoals,
 deleteMilestoneFromGoals: s.deleteMilestoneFromGoals,
 }))
 );

 useEffect(() => {
 let cancelled = false;

 const loadGoalDetails = async () => {
 try {
 setIsLoading(true);
 const fullGoal = await goalsApi.getById(goal.id, {
 include_milestones: true,
 include_tasks: true,
 include_subtasks: true,
 include_todos: true
 });
 if (!cancelled) updateGoal(fullGoal);
 } catch (err) {
 if (!cancelled) {
 console.error('Error loading goal details:', err);
 setError(err instanceof Error ? err.message : 'Failed to load goal details');
 }
 } finally {
 if (!cancelled) setIsLoading(false);
 }
 };

 loadGoalDetails();
 return () => { cancelled = true; };
 }, [goal.id, updateGoal]);

 const handleQuickAddMilestone = async (title: string) => {
 try {
 const newMilestone = await milestonesApi.create({
 title,
 description: '',
 status: StatusType.OUTSTANDING,
 priority: PriorityType.MEDIUM,
 goal_id: goal.id,
 position: (currentGoal.milestones?.length ?? 0) + 1,
 });
 addMilestoneToGoal(newMilestone, goal.id);
 toast.success('Milestone added');
 } catch (err) {
 console.error('Quick-add milestone failed:', err);
 toast.error('Failed to add milestone');
 }
 };

 const handleCreateMilestone = async (milestoneData: Partial<Milestone>) => {
 try {
 const newMilestone = await milestonesApi.create({
 title: milestoneData.title!,
 description: milestoneData.description!,
 status: milestoneData.status || StatusType.OUTSTANDING,
 priority: milestoneData.priority || PriorityType.MEDIUM,
 due_date: milestoneData.due_date,
 end_datetime: milestoneData.end_datetime,
 goal_id: goal.id,
 position: (currentGoal.milestones?.length ?? 0) + 1
 });
 
 // Use optimistic update from store
 addMilestoneToGoal(newMilestone, goal.id);
 setIsCreatingMilestone(false);
 } catch (error) {
 console.error('Error creating milestone:', error);
 setError('Failed to create milestone');
 // Revert optimistic update on error by refetching
 try {
 const fullGoal = await goalsApi.getById(goal.id, {
 include_milestones: true,
 include_tasks: true,
 include_subtasks: true,
 include_todos: true
 });
 updateGoal(fullGoal);
 } catch (fetchError) {
 console.error('Failed to revert milestone creation:', fetchError);
 }
 }
 };

 const handleMilestoneUpdate = async (milestoneId: string, data: Partial<Milestone>) => {
 try {
 const updatedMilestone = await milestonesApi.update({
 id: milestoneId,
 ...data
 });
 updateMilestoneInGoals(updatedMilestone);
 } catch (error) {
 console.error('Error updating milestone:', error);
 setError('Failed to update milestone');
 }
 };

 const handleGoalInlineUpdate = async (data: Partial<Goal>) => {
 try {
 const updatedGoal = await goalsApi.update({
 id: currentGoal.id,
 ...data,
 });
 updateGoal(updatedGoal);
 } catch (error) {
 console.error('Error updating goal:', error);
 toast.error('Failed to update goal');
 throw error;
 }
 };

 const handleMilestoneDelete = async (milestoneId: string) => {
 try {
 await milestonesApi.delete(milestoneId);
 deleteMilestoneFromGoals(milestoneId);
 } catch (error) {
 console.error('Error deleting milestone:', error);
 setError('Failed to delete milestone');
 }
 };

 const handleSyncCalendar = async () => {
 setIsSyncingCalendar(true);
 setError(null);
 try {
 const eventsToCreate: Array<{ kind: 'goal' | 'milestone' | 'task'; data: Omit<Event, 'id'> }> = [];

 eventsToCreate.push({
 kind: 'goal',
 data: {
 title: `Goal: ${currentGoal.title}`,
 description: `Goal deadline: ${currentGoal.description || 'No description'}`,
 start_datetime: currentGoal.end_datetime || new Date().toISOString(),
 end_datetime: currentGoal.end_datetime || new Date().toISOString(),
 status: currentGoal.status,
 location: 'Goal Planning',
 },
 });

 if (currentGoal.milestones && currentGoal.milestones.length > 0) {
 currentGoal.milestones.forEach(milestone => {
 eventsToCreate.push({
 kind: 'milestone',
 data: {
 title: `Milestone: ${milestone.title}`,
 description: `${milestone.description || 'No description'}\nGoal: ${currentGoal.title}`,
 start_datetime: milestone.due_date || milestone.end_datetime || new Date().toISOString(),
 end_datetime: milestone.due_date || milestone.end_datetime || new Date().toISOString(),
 status: milestone.status,
 location: 'Milestone Review',
 },
 });

 if (milestone.tasks && milestone.tasks.length > 0) {
 milestone.tasks
 .filter(task => task.due_date && task.priority === PriorityType.HIGH)
 .forEach(task => {
 eventsToCreate.push({
 kind: 'task',
 data: {
 title: `Task: ${task.title}`,
 description: `${task.description || 'No description'}\nMilestone: ${milestone.title}\nGoal: ${currentGoal.title}`,
 start_datetime: task.due_date!,
 end_datetime: task.due_date!,
 status: task.status,
 location: 'Task Work',
 },
 });
 });
 }
 });
 }

 const results = await Promise.allSettled(
 eventsToCreate.map((event) => eventsApi.create(event.data))
 );
 const createdEvents = results
 .filter((result): result is PromiseFulfilledResult<Event> => result.status === 'fulfilled')
 .map((result) => result.value);
 const failedEvents = results.filter((result) => result.status === 'rejected');

 if (createdEvents.length > 0) addEvents(createdEvents);

 const createdKinds = results
 .map((result, index) => result.status === 'fulfilled' ? eventsToCreate[index].kind : null)
 .filter(Boolean);
 const goalEvents = createdKinds.filter((kind) => kind === 'goal').length;
 const milestoneEvents = createdKinds.filter((kind) => kind === 'milestone').length;
 const taskEvents = createdKinds.filter((kind) => kind === 'task').length;

 if (failedEvents.length > 0) {
 console.error('Some calendar events failed to sync:', failedEvents);
 toast.error(`Synced ${createdEvents.length}, failed ${failedEvents.length}`);
 } else {
 toast.success(`Synced ${createdEvents.length} calendar item${createdEvents.length === 1 ? '' : 's'}`);
 }

 alert(`Synced ${createdEvents.length} items to calendar:\n` +
 `• ${goalEvents} Goal event\n` +
 `• ${milestoneEvents} Milestone events\n` +
 `• ${taskEvents} High-priority task events\n\n` +
 (failedEvents.length > 0 ? `⚠ ${failedEvents.length} items failed. Check console/details.\n\n` : '') +
 `Check the calendar widget to see your scheduled items!`);
 } catch (err) {
 setError(err instanceof Error ? err.message : 'Failed to sync with calendar');
 } finally {
 setIsSyncingCalendar(false);
 }
 };

 const handleCreateTask = (newTask: Task, goalId: string, milestoneId?: string) => {
 if (newTask?.id && newTask?.title) {
 try {
 const normalizedTask = {
 ...newTask,
 goal_id: newTask.goal_id ?? goalId,
 todos: newTask.todos ?? [],
 subtasks: newTask.subtasks ?? [],
 };
 if (!milestoneId || normalizedTask.scope === 'goal') {
 updateTaskInGoals({ ...normalizedTask, milestone_id: undefined, scope: 'goal' });
 } else {
 addTaskToMilestoneInGoal(normalizedTask, milestoneId, goalId);
 }
 setIsCreatingTask(false);
 setTaskFormMode('task');
 setSelectedMilestoneId(null);
 // Optionally, trigger a background refresh if still desired for absolute consistency
 // For example: goalsApi.getById(goalId, { include_milestones: true, ... }).then(updatedG => updateGoal(updatedG));
 } catch (err) {
 // This catch might not be effective if addTaskToMilestoneInGoal is purely synchronous
 // and doesn't throw. Error handling for store updates might need a different approach
 // if the update itself could fail in a way that needs user feedback.
 // For now, assuming store update is robust.
 console.error('Error optimistically adding task to store:', err);
 setError(err instanceof Error ? err.message : 'Failed to update task list');
 }
 } else {
 console.warn("handleCreateTask received an item that is not a Task:", newTask);
 // Fallback or error for unexpected type
 setError('Received unexpected item type during task creation.');
 }
 };

 const handleCreateRoutineAction = (
 item: Subtask | Todo,
 kind: ActionKind,
 _goalId: string,
 _milestoneId: string,
 _taskId: string,
 ) => {
 if (kind === 'todo') {
 updateTodoInGoals(item as Todo);
 } else {
 updateSubtaskInGoals(item as Subtask);
 }
 setSelectedRoutineTaskId(null);
 toast.success(kind === 'todo' ? 'Routine todo added' : 'Routine subtask added');
 };


 const progress = calculateGoalProgress(currentGoal);
 const progressLanes = calculateGoalProgressLanes(currentGoal);
 const goalTasks = (currentGoal.tasks ?? []).filter(
 (task) => (task.scope === 'goal' || !task.milestone_id) && task.kind !== 'routine',
 );
 const goalRoutines = (currentGoal.tasks ?? []).filter(
 (task) => (task.scope === 'goal' || !task.milestone_id) && task.kind === 'routine',
 );

 const handleAddMilestone = () => {
 setIsCreatingMilestone(true);
 };

 const openTaskForm = (mode: 'task' | 'routine', milestoneId?: string | null) => {
 setTaskFormMode(mode);
 setSelectedMilestoneId(milestoneId ?? null);
 setIsCreatingTask(true);
 };

 if (isLoading) {
 return (
 <div className="flex justify-center items-center h-64">
 <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--tn-accent)' }}></div>
 </div>
 );
 }

 if (error) {
 return (
 <div
 className="p-4 rounded-lg border"
 style={{
 background: 'color-mix(in srgb, var(--tn-bad, #c25d63) 10%, var(--tn-card))',
 color: 'var(--tn-bad, #c25d63)',
 borderColor: 'color-mix(in srgb, var(--tn-bad, #c25d63) 38%, var(--tn-card))',
 }}
 >
 <p className="font-medium">Error loading goal details</p>
 <p className="text-sm mt-1">{error}</p>
 <button
 onClick={() => {
 const loadGoalDetails = async () => {
 try {
 const fullGoal = await goalsApi.getById(goal.id, {
 include_milestones: true,
 include_tasks: true,
 include_subtasks: true,
 include_todos: true
 });
 

 updateGoal(fullGoal);
 } catch (error) {
 console.error('Error loading goal details:', error);
 setError('Failed to load goal details');
 }
 };
 loadGoalDetails();
 }}
 className="mt-2 px-4 py-2 text-sm font-medium rounded-lg"
 style={{ background: 'var(--tn-bad, #c25d63)', color: '#fff' }}
 >
 Try Again
 </button>
 </div>
 );
 }

 return (
 <div data-testid="goal-detail-view" className="min-h-screen w-full max-w-full overflow-x-hidden">
 {/* Error notification */}
 {error && (
 <div
 className="mb-4 border px-4 py-3 rounded-lg flex items-center justify-between"
 style={{
 background: 'color-mix(in srgb, var(--tn-bad, #c25d63) 10%, var(--tn-card))',
 color: 'var(--tn-bad, #c25d63)',
 borderColor: 'color-mix(in srgb, var(--tn-bad, #c25d63) 38%, var(--tn-card))',
 }}
 >
 <span>{error}</span>
 <button
 onClick={() => setError(null)}
 className="ml-4"
 style={{ color: 'var(--tn-bad, #c25d63)' }}
 >
 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
 </svg>
 </button>
 </div>
 )}

 <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
 <button
 className="btn btn-secondary w-fit"
 onClick={onBack}
 >
 <svg
 className="w-4 h-4 mr-1.5"
 fill="none"
 stroke="currentColor"
 viewBox="0 0 24 24"
 xmlns="http://www.w3.org/2000/svg"
 >
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
 </svg>
 Back
 </button>
 <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
 <button
 onClick={handleSyncCalendar}
 disabled={isSyncingCalendar}
 className="btn btn-primary flex-1 justify-center sm:flex-none disabled:opacity-50"
 title="Sync goal, milestones, and high-priority tasks to calendar"
 style={{ background: 'var(--tn-good, #2f7d50)', color: 'white' }}
 >
 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
 </svg>
 <span>{isSyncingCalendar ? 'Syncing...' : 'Sync Calendar'}</span>
 </button>
 <button
 onClick={handleAddMilestone}
 className="btn btn-primary flex-1 justify-center sm:flex-none"
 >
 + Milestone
 </button>
 <button
 onClick={() => {
 openTaskForm('task', null);
 }}
 className="btn btn-secondary flex-1 justify-center sm:flex-none"
 >
 + Task
 </button>
 <button
 onClick={() => window.print()}
 title="Print goal as a clean document"
 className="btn btn-secondary no-print flex-1 justify-center sm:flex-none"
 >
 Print
 </button>
 <button
 onClick={() => setShowDeleteGoalConfirm(true)}
 className="btn btn-danger flex-1 justify-center sm:flex-none"
 >
 Delete
 </button>
 </div>
 </div>

 <Modal
 open={isCreatingMilestone}
 title="Create New Milestone"
 onClose={() => setIsCreatingMilestone(false)}
 >
 <MilestoneForm
 goalId={goal.id}
 onSuccess={handleCreateMilestone}
 onCancel={() => setIsCreatingMilestone(false)}
 />
 </Modal>

 <Modal
 open={isCreatingTask}
 title={taskFormMode === 'routine' ? 'Add Goal Routine' : selectedMilestoneId ? 'Add Milestone Task' : 'Add Goal Task'}
 onClose={() => {
 setIsCreatingTask(false);
 setTaskFormMode('task');
 setSelectedMilestoneId(null);
 }}
 >
 <TaskForm
 goalId={goal.id}
 milestoneId={selectedMilestoneId ?? undefined}
 initialData={taskFormMode === 'routine' ? { kind: 'routine', scope: 'goal', status: StatusType.STARTED, priority: PriorityType.MEDIUM } : undefined}
 onSuccess={handleCreateTask}
 onCancel={() => {
 setIsCreatingTask(false);
 setTaskFormMode('task');
 setSelectedMilestoneId(null);
 }}
 />
 </Modal>

 <Modal
 open={selectedRoutineTaskId !== null}
 title="Add Routine Todo"
 onClose={() => setSelectedRoutineTaskId(null)}
 >
 {selectedRoutineTaskId && (
 <ActionForm
 goalId={goal.id}
 milestoneId=""
 taskId={selectedRoutineTaskId}
 defaultKind="todo"
 onSuccess={handleCreateRoutineAction}
 onCancel={() => setSelectedRoutineTaskId(null)}
 />
 )}
 </Modal>

 {/* Goal header */}
 <GoalHeaderCard goal={currentGoal} progress={progress} progressLanes={progressLanes} onUpdate={handleGoalInlineUpdate} />
 <section
 className="mb-8 rounded-3xl border p-4 sm:p-5"
 style={{ border: 'var(--tn-line)', background: 'var(--tn-card)' }}
 >
 <JourneyThemeSelector
 value={currentGoal.journey_theme_id ?? 'mountain'}
 onChange={(journeyThemeId) => void handleGoalInlineUpdate({ journey_theme_id: journeyThemeId })}
 compact
 showLivePreview
 />
 </section>
 <GoalMetricsPanel goalId={currentGoal.id} />
 <GoalCompletionRulePanel goal={currentGoal} onSaved={updateGoal} />
 <GoalTasksPanel
 tasks={goalTasks}
 onAddTask={() => openTaskForm('task', null)}
 />
 <GoalRoutinesPanel
 routines={goalRoutines}
 onAddRoutine={() => openTaskForm('routine', null)}
 onAddTodo={(taskId) => setSelectedRoutineTaskId(taskId)}
 />

 {/* Milestones timeline */}
 <MilestonesTimeline
 milestones={currentGoal.milestones || []}
 goalId={currentGoal.id}
 onUpdate={handleMilestoneUpdate}
 onDelete={handleMilestoneDelete}
 onQuickAddMilestone={handleQuickAddMilestone}
 onAddTask={(milestoneId) => {
 openTaskForm('task', milestoneId);
 }}
 />

 <ConfirmDialog
 open={showDeleteGoalConfirm}
 title="Delete goal"
 description="Are you sure you want to delete this goal? All linked milestones, tasks, and todos will be removed. This action cannot be undone."
 destructive
 confirmLabel="Delete"
 busy={isDeleting}
 onConfirm={async () => {
 setIsDeleting(true);
 try {
 await onDelete();
 setShowDeleteGoalConfirm(false);
 onBack();
 } catch (error) {
 console.error('Failed to delete goal:', error);
 toast.error('Failed to delete goal');
 } finally {
 setIsDeleting(false);
 }
 }}
 onCancel={() => !isDeleting && setShowDeleteGoalConfirm(false)}
 />
 </div>
 );
};

const GoalTasksPanel: React.FC<{
 tasks: Task[];
 onAddTask: () => void;
}> = ({ tasks, onAddTask }) => {
 const completedTasks = tasks.filter((task) => task.status === StatusType.FINISHED).length;

 return (
 <section
 className="mb-8 rounded-3xl border p-4 sm:p-5"
 style={{
 border: 'var(--tn-line)',
 background: 'color-mix(in srgb, var(--tn-card) 92%, var(--tn-bg))',
 boxShadow: 'var(--tn-shadow)',
 }}
 >
 <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
 <div>
 <div className="flex flex-wrap items-center gap-2">
 <h2 className="text-xl font-semibold text-foreground">Goal Tasks</h2>
 {tasks.length > 0 && (
 <span
 className="rounded-full px-2.5 py-1 text-xs font-medium"
 style={{ background: 'var(--tn-hover)', color: 'var(--tn-fg-muted)' }}
 >
 {completedTasks}/{tasks.length} finished
 </span>
 )}
 </div>
 <p className="text-sm text-muted-foreground dark:text-muted-foreground">
 One-off project work linked directly to this goal. These tasks contribute to Structural Progress.
 </p>
 </div>
 <button type="button" onClick={onAddTask} className="btn btn-primary w-full justify-center sm:w-auto">
 + Goal Task
 </button>
 </div>

 {tasks.length === 0 ? (
 <div
 className="rounded-2xl border p-4 text-sm"
 style={{ border: 'var(--tn-line)', background: 'var(--tn-card)', color: 'var(--tn-fg-muted)' }}
 >
 No goal-level project tasks yet. Milestone tasks remain in the timeline below.
 </div>
 ) : (
 <div className="grid gap-3 lg:grid-cols-2">
 {tasks.map((task) => {
 const subtasks = task.subtasks ?? [];
 const completedSubtasks = subtasks.filter((subtask) => subtask.status === StatusType.FINISHED).length;
 const completedStructuralItems = (task.status === StatusType.FINISHED ? 1 : 0) + completedSubtasks;
 const totalStructuralItems = 1 + subtasks.length;
 const structuralProgress = Math.round((completedStructuralItems / totalStructuralItems) * 100);
 const isFinished = task.status === StatusType.FINISHED;

 return (
 <Link
 key={task.id}
 href={`/task/${task.id}`}
 className="group rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2"
 style={{
 border: 'var(--tn-line)',
 background: 'var(--tn-card)',
 '--tw-ring-color': 'var(--tn-accent)',
 } as React.CSSProperties}
 >
 <div className="mb-3 flex items-start justify-between gap-3">
 <div className="min-w-0">
 <h3 className={`truncate text-base font-semibold ${isFinished ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
 {task.title}
 </h3>
 {task.description && (
 <p className="mt-1 line-clamp-2 text-sm text-muted-foreground dark:text-muted-foreground">
 {stripMarkdown(task.description)}
 </p>
 )}
 </div>
 <span
 className="shrink-0 rounded-full px-2 py-1 text-xs font-medium"
 style={{
 background: isFinished
 ? 'color-mix(in srgb, var(--tn-good, #2f7d50) 14%, var(--tn-card))'
 : 'var(--tn-hover)',
 color: isFinished ? 'var(--tn-good, #2f7d50)' : 'var(--tn-fg-muted)',
 }}
 >
 {STATUS_LABELS[task.status]}
 </span>
 </div>

 <div className="mb-2 flex items-center justify-between gap-3 text-xs">
 <span className="font-medium text-foreground">Structural</span>
 <span className="text-muted-foreground dark:text-muted-foreground">{structuralProgress}%</span>
 </div>
 <div className="mb-3 h-2 overflow-hidden rounded-full" style={{ background: 'var(--tn-hover)' }}>
 <div
 className="h-full rounded-full transition-[width]"
 style={{ width: `${structuralProgress}%`, background: 'var(--tn-accent)' }}
 />
 </div>

 <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground dark:text-muted-foreground">
 <span>{task.kind === 'challenge' ? 'Challenge' : 'Project task'}</span>
 <span>{completedSubtasks}/{subtasks.length} subtasks</span>
 {task.due_date && <span>Due {formatDate(task.due_date)}</span>}
 <span className="ml-auto font-medium transition-colors group-hover:text-foreground">Open task →</span>
 </div>
 </Link>
 );
 })}
 </div>
 )}
 </section>
 );
};

const GoalRoutinesPanel: React.FC<{
 routines: Task[];
 onAddRoutine: () => void;
 onAddTodo: (taskId: string) => void;
}> = ({ routines, onAddRoutine, onAddTodo }) => (
 <section
 className="mb-8 rounded-3xl border p-4 sm:p-5"
 style={{
 border: 'var(--tn-line)',
 background: 'color-mix(in srgb, var(--tn-card) 92%, var(--tn-bg))',
 boxShadow: 'var(--tn-shadow)',
 }}
 >
 <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
 <div>
 <h2 className="text-xl font-semibold text-foreground">Goal Routines</h2>
 <p className="text-sm text-muted-foreground dark:text-muted-foreground">
 Recurring todos that belong to the whole goal, not a milestone.
 </p>
 </div>
 <button type="button" onClick={onAddRoutine} className="btn btn-primary w-full justify-center sm:w-auto">
 + Routine
 </button>
 </div>

 {routines.length === 0 ? (
 <div
 className="rounded-2xl border p-4 text-sm"
 style={{ border: 'var(--tn-line)', background: 'var(--tn-card)', color: 'var(--tn-fg-muted)' }}
 >
 No goal-level routines yet. Add one for habits like food tracking, shutdown, or daily review.
 </div>
 ) : (
 <div className="grid gap-3 lg:grid-cols-2">
 {routines.map((routine) => {
 const todos = routine.todos ?? [];
 return (
 <article
 key={routine.id}
 className="rounded-2xl border p-4"
 style={{ border: 'var(--tn-line)', background: 'var(--tn-card)' }}
 >
 <div className="mb-3 flex items-start justify-between gap-3">
 <div className="min-w-0">
 <h3 className="truncate text-base font-semibold text-foreground">{routine.title}</h3>
 {routine.description && (
 <p className="mt-1 line-clamp-2 text-sm text-muted-foreground dark:text-muted-foreground">
 {routine.description}
 </p>
 )}
 </div>
 <span
 className="rounded-full px-2 py-1 text-xs font-medium"
 style={{
 background: 'color-mix(in srgb, var(--tn-accent) 10%, var(--tn-card))',
 color: 'var(--tn-accent)',
 }}
 >
 routine
 </span>
 </div>

 {todos.length > 0 ? (
 <ul className="mb-3 space-y-2">
 {todos.map((todo) => (
 <li
 key={todo.id}
 className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm"
 style={{ background: 'var(--tn-hover)' }}
 >
 <span
 className="h-2 w-2 flex-shrink-0 rounded-full"
 style={{ background: 'var(--tn-accent)' }}
 />
 <span className="min-w-0 flex-1 truncate text-foreground">{todo.title}</span>
 <span className="flex-shrink-0 text-xs text-muted-foreground dark:text-muted-foreground">
 {todo.repeat_interval || 'recurring'}
 </span>
 </li>
 ))}
 </ul>
 ) : (
 <p className="mb-3 rounded-xl px-3 py-2 text-sm text-muted-foreground dark:text-muted-foreground" style={{ background: 'var(--tn-hover)' }}>
 No recurring todos yet.
 </p>
 )}

 <div className="flex justify-end">
 <button type="button" onClick={() => onAddTodo(routine.id)} className="btn btn-secondary !px-3 !py-2 text-sm">
 + Todo
 </button>
 </div>
 </article>
 );
 })}
 </div>
 )}
 </section>
);
