'use client';

import React, { useState, useEffect } from 'react';
import { GoalItem as Goal, MilestoneItem as Milestone, StatusType, PriorityType, TaskItem as Task } from '@/lib/types';
import { MilestoneForm } from './MilestoneForm';
import { TaskForm } from './TaskForm';
import { milestonesApi, eventsApi, goalsApi } from '@/lib/api';
import { useStore } from '@/store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { calculateGoalProgress } from '@/lib/progress';
import { toast } from '@/store/useToast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import GoalHeaderCard from './GoalHeaderCard';
import MilestonesTimeline from './MilestonesTimeline';
import { useTheme } from '@/context/ThemeContext';

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
 const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(initialMilestoneId ?? null);
 const [isSyncingCalendar, setIsSyncingCalendar] = useState(false);
 const [isLoading, setIsLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);

 const [showDeleteGoalConfirm, setShowDeleteGoalConfirm] = useState(false);
 const [isDeleting, setIsDeleting] = useState(false);

 const { theme } = useTheme();
 const isDark = theme === 'dark';
 // Subscribe only to the specific goal from the store — unrelated goals
 // changing won't re-render this view.
 const currentGoal = useStore((s) => s.goals.find((g) => g.id === goal.id) ?? goal);
 const {
 updateGoal,
 addTaskToMilestoneInGoal,
 addMilestoneToGoal,
 addEvents,
 updateMilestoneInGoals,
 deleteMilestoneFromGoals,
 } = useStore(
 useShallow((s) => ({
 updateGoal: s.updateGoal,
 addTaskToMilestoneInGoal: s.addTaskToMilestoneInGoal,
 addMilestoneToGoal: s.addMilestoneToGoal,
 addEvents: s.addEvents,
 updateMilestoneInGoals: s.updateMilestoneInGoals,
 deleteMilestoneFromGoals: s.deleteMilestoneFromGoals,
 }))
 );

 useEffect(() => {
 let cancelled = false;
 const storeGoal = useStore.getState().goals.find(g => g.id === goal.id);
 const alreadyHydrated = !!storeGoal?.milestones?.length;

 if (alreadyHydrated) {
 setIsLoading(false);
 return;
 }

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
 position: currentGoal.milestones?.length ?? 0,
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
 position: goal.milestones?.length || 0
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
 const eventsToCreate = [];

 eventsToCreate.push({
 title: `Goal: ${currentGoal.title}`,
 description: `Goal deadline: ${currentGoal.description || 'No description'}`,
 start_datetime: currentGoal.end_datetime || new Date().toISOString(),
 end_datetime: currentGoal.end_datetime || new Date().toISOString(),
 status: currentGoal.status,
 goal_id: currentGoal.id,
 location: 'Goal Planning',
 created_at: new Date().toISOString(),
 updated_at: new Date().toISOString(),
 });

 if (currentGoal.milestones && currentGoal.milestones.length > 0) {
 currentGoal.milestones.forEach(milestone => {
 eventsToCreate.push({
 title: `Milestone: ${milestone.title}`,
 description: `${milestone.description || 'No description'}\nGoal: ${currentGoal.title}`,
 start_datetime: milestone.due_date || milestone.end_datetime || new Date().toISOString(),
 end_datetime: milestone.due_date || milestone.end_datetime || new Date().toISOString(),
 status: milestone.status,
 goal_id: currentGoal.id,
 location: 'Milestone Review',
 created_at: new Date().toISOString(),
 updated_at: new Date().toISOString(),
 });

 if (milestone.tasks && milestone.tasks.length > 0) {
 milestone.tasks
 .filter(task => task.due_date && task.priority === PriorityType.HIGH)
 .forEach(task => {
 eventsToCreate.push({
 title: `Task: ${task.title}`,
 description: `${task.description || 'No description'}\nMilestone: ${milestone.title}\nGoal: ${currentGoal.title}`,
 start_datetime: task.due_date!,
 end_datetime: task.due_date!,
 status: task.status,
 goal_id: currentGoal.id,
 location: 'Task Work',
 created_at: new Date().toISOString(),
 updated_at: new Date().toISOString(),
 });
 });
 }
 });
 }

 const createdEvents = await Promise.all(
 eventsToCreate.map(eventData => eventsApi.create(eventData))
 );

 addEvents(createdEvents);

 const goalEvents = 1;
 const milestoneEvents = currentGoal.milestones?.length || 0;
 const taskEvents = createdEvents.length - goalEvents - milestoneEvents;

 alert(`Successfully synced ${createdEvents.length} items to calendar:\n` +
 `• ${goalEvents} Goal event\n` +
 `• ${milestoneEvents} Milestone events\n` +
 `• ${taskEvents} High-priority task events\n\n` +
 `Check the calendar widget to see your scheduled items!`);
 } catch (err) {
 setError(err instanceof Error ? err.message : 'Failed to sync with calendar');
 } finally {
 setIsSyncingCalendar(false);
 }
 };

 const handleCreateTask = (newTask: Task, goalId: string, milestoneId: string) => {
 // Type guard to ensure newTask is Task, not Todo, if necessary.
 // For now, assuming TaskForm only sends Task.
 if ('milestone_id' in newTask && 'todos' in newTask && 'subtasks' in newTask) {
 try {
 addTaskToMilestoneInGoal(newTask, milestoneId, goalId);
 setIsCreatingTask(false);
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


 const progress = calculateGoalProgress(currentGoal);

 const handleAddMilestone = () => {
 setIsCreatingMilestone(true);
 };

 if (isLoading) {
 return (
 <div className="flex justify-center items-center h-64">
 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
 </div>
 );
 }

 if (error) {
 return (
 <div className="bg-red-50 dark:bg-red-900 text-red-800 dark:text-red-200 p-4 rounded-lg">
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
 className="mt-2 px-4 py-2 text-sm font-medium text-white bg-red-600 dark:bg-red-500 rounded-lg hover:bg-red-700 dark:hover:bg-red-600"
 >
 Try Again
 </button>
 </div>
 );
 }

 return (
 <div data-testid="goal-detail-view" className={`${isDark ? 'bg-card' : 'bg-card'} min-h-screen`}>
 {/* Error notification */}
 {error && (
 <div className="mb-4 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 text-red-800 dark:text-red-200 px-4 py-3 rounded-lg flex items-center justify-between">
 <span>{error}</span>
 <button
 onClick={() => setError(null)}
 className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 ml-4"
 >
 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
 </svg>
 </button>
 </div>
 )}

 <div className="flex justify-between items-center mb-6">
 <button
 className="px-2 py-1.5 text-sm rounded-md font-medium cursor-pointer transition-colors duration-200 bg-muted dark:bg-card text-foreground dark:text-muted-foreground/60 hover:bg-muted dark:hover:bg-muted flex items-center"
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
 <div className="flex space-x-2">
 <button
 onClick={handleSyncCalendar}
 disabled={isSyncingCalendar}
 className="px-3 py-1.5 text-sm rounded-md font-medium cursor-pointer transition-colors duration-200 bg-green-600 dark:bg-green-500 text-white hover:bg-green-700 dark:hover:bg-green-600 disabled:opacity-50 flex items-center space-x-1"
 title="Sync goal, milestones, and high-priority tasks to calendar"
 >
 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
 </svg>
 <span>{isSyncingCalendar ? 'Syncing...' : 'Sync Calendar'}</span>
 </button>
 <button
 onClick={handleAddMilestone}
 className="px-2 py-1.5 text-sm rounded-md font-medium cursor-pointer transition-colors duration-200 bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600"
 >
 + Milestone
 </button>
 <button
 onClick={() => window.print()}
 title="Print goal as a clean document"
 className="no-print px-2 py-1.5 text-sm rounded-md font-medium border border-border dark:border-border text-foreground dark:text-muted-foreground/60 hover:bg-muted dark:hover:bg-card"
 >
 Print
 </button>
 <button
 onClick={() => setShowDeleteGoalConfirm(true)}
 className="px-2 py-1.5 text-sm rounded-md font-medium cursor-pointer transition-colors duration-200 bg-red-500 dark:bg-red-600 text-white hover:bg-red-600 dark:hover:bg-red-700"
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
 open={isCreatingTask && !!selectedMilestoneId}
 title="Add Task"
 onClose={() => {
 setIsCreatingTask(false);
 setSelectedMilestoneId(null);
 }}
 >
 {selectedMilestoneId && (
 <TaskForm
 goalId={goal.id}
 milestoneId={selectedMilestoneId}
 onSuccess={handleCreateTask}
 onCancel={() => {
 setIsCreatingTask(false);
 setSelectedMilestoneId(null);
 }}
 />
 )}
 </Modal>

 {/* Goal header */}
 <GoalHeaderCard goal={currentGoal} progress={progress} />

 {/* Milestones timeline */}
 <MilestonesTimeline
 milestones={currentGoal.milestones || []}
 goalId={currentGoal.id}
 onUpdate={handleMilestoneUpdate}
 onDelete={handleMilestoneDelete}
 onQuickAddMilestone={handleQuickAddMilestone}
 onAddTask={(milestoneId) => {
 setSelectedMilestoneId(milestoneId);
 setIsCreatingTask(true);
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
