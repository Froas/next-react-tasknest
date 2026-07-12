"use client";

import React, { useState, useEffect } from 'react';
import { withAuth } from '@/hoc/withAuth';
import dynamic from 'next/dynamic';
import { GoalItem as Goal, MilestoneItem as Milestone, TaskItem as Task, TodoItem as Todo, SubtaskItem as Subtask } from '@/lib/types';
import { goalsApi, milestonesApi } from '@/lib/api';
import { useStore } from '@/store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { toast } from '@/store/useToast';
import { Modal } from '@/components/ui/Modal';
import { usePersistentState } from '@/lib/usePersistentState';
import { StatusType, PriorityType } from '@/lib/types';
import { priorityWeight } from '@/lib/sort';
import { useSession } from 'next-auth/react';

const DashboardView = dynamic(() => import('@/components/dashboard/DashboardView').then(m => m.DashboardView));
const GoalDetailView = dynamic(() => import('@/components/dashboard/GoalDetailView').then(m => m.GoalDetailView));
const CalendarWidget = dynamic(() => import('@/components/dashboard/CalendarWidget').then(m => m.CalendarWidget));
const QuickActions = dynamic(() => import('@/components/dashboard/QuickActions').then(m => m.QuickActions));
const GoalForm = dynamic(() => import('@/components/dashboard/GoalForm').then(m => m.GoalForm), { ssr: false });
const MilestoneForm = dynamic(() => import('@/components/dashboard/MilestoneForm').then(m => m.MilestoneForm));
const TaskForm = dynamic(() => import('@/components/dashboard/TaskForm').then(m => m.TaskForm));
const ActionForm = dynamic(() => import('@/components/dashboard/ActionForm').then(m => m.ActionForm));

const Home = () => {
 const { status } = useSession();
 
 // View States
 const [currentView, setCurrentView] = useState<'dashboard' | 'goal-detail' | 'form' | 'visualization'>('dashboard');
 const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
 
 // Form States
 const [isFormOpen, setIsFormOpen] = useState(false);
 const [isEditMode, setIsEditMode] = useState(false);
 const [isCreatingGoal, setIsCreatingGoal] = useState(false);
 const [isCreatingMilestone, setIsCreatingMilestone] = useState(false);
 
 // Selection States
 const [isSelectingGoal, setIsSelectingGoal] = useState(false);
 const [isSelectingMilestone, setIsSelectingMilestone] = useState(false);
 const [isSelectingTask, setIsSelectingTask] = useState(false);
 const [pendingAction, setPendingAction] = useState<'milestone' | 'task' | 'routine' | 'todo' | 'subtask' | null>(null);
 const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(null);
 const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
 
 // Form Visibility States
 const [showTaskForm, setShowTaskForm] = useState(false);
 const [showActionForm, setShowActionForm] = useState(false);
 const [actionFormKind, setActionFormKind] = useState<'subtask' | 'todo'>('subtask');
 
 // Selected Item States
 const [selectedTask, setSelectedTask] = useState<Task | null>(null);

 // Delete States
 const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
 const [isDeleting, setIsDeleting] = useState(false);

 // Store Integration — split into per-slice subscriptions so the page does
 // not re-render when unrelated slices (events, todos, etc.) change.
 const goals = useStore((s) => s.goals);
 const isLoadingGoals = useStore((s) => s.isLoadingGoals);
 const goalsError = useStore((s) => s.goalsError);
 const {
 fetchGoals,
 fetchEvents,
 addGoal,
 updateGoal,
 deleteGoal: deleteGoalFromStore,
 addMilestone,
 addMilestoneToGoal,
 addTaskToMilestoneInGoal,
 updateTaskInGoals,
 updateTodoInGoals,
 updateSubtaskInGoals,
 } = useStore(
 useShallow((s) => ({
 fetchGoals: s.fetchGoals,
 fetchEvents: s.fetchEvents,
 addGoal: s.addGoal,
 updateGoal: s.updateGoal,
 deleteGoal: s.deleteGoal,
 addMilestone: s.addMilestone,
 addMilestoneToGoal: s.addMilestoneToGoal,
 addTaskToMilestoneInGoal: s.addTaskToMilestoneInGoal,
 updateTaskInGoals: s.updateTaskInGoals,
 updateTodoInGoals: s.updateTodoInGoals,
 updateSubtaskInGoals: s.updateSubtaskInGoals,
 }))
 );

 // Order state for goals (shared with DashboardView and selection modals)
 const [orderBy, setOrderBy] = usePersistentState<'title' | 'start_desc' | 'start_asc' | 'priority_desc' | 'priority_asc'>('dashboard:order', 'title');
 const selectedGoal = selectedGoalId ? goals.find((goal: Goal) => goal.id === selectedGoalId) : null;

 useEffect(() => {
 fetchGoals();
 fetchEvents();
 }, [fetchGoals, fetchEvents]);

 // Order state for goals (shared with DashboardView and selection modals)

 if (status === 'loading' || isLoadingGoals) {
 return (
 <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--tn-bg)', color: 'var(--tn-fg)' }}>
 <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--tn-accent)' }}></div>
 </div>
 );
 }

 if (status === 'unauthenticated') {
 return (
 <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--tn-bg)', color: 'var(--tn-fg-muted)' }}>
 <div>You are not authenticated.</div>
 </div>
 );
 }

 if (goalsError) {
 return (
 <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--tn-bg)' }}>
 <div style={{ color: 'var(--tn-bad, #c25d63)' }}>Error: {goalsError}</div>
 </div>
 );
 }

 const handleGoalClick = async (goal: Goal) => {
 try {
 const fullGoal = await goalsApi.getById(goal.id, {
 include_milestones: true,
 include_tasks: true,
 include_subtasks: true,
 include_todos: true
 });
 updateGoal(fullGoal);
 setSelectedGoalId(goal.id);
 setCurrentView('goal-detail');
 } catch (error) {
 console.error('Failed to load goal details:', error);
 }
 };

 const handleAddGoal = () => {
 setIsEditMode(false);
 setIsCreatingGoal(true);
 };

 const handleEditGoal = () => {
 setIsEditMode(true);
 setIsFormOpen(true);
 setCurrentView('form');
 };

 const handleFormClose = () => {
 setIsFormOpen(false);
 setIsEditMode(false);
 setCurrentView('dashboard');
 };

 const handleGoalSubmit = async (goalData: Partial<Goal>) => {
 try {
 if (isEditMode && selectedGoal) {
 const updatedGoal = await goalsApi.update({
 id: selectedGoal.id,
 title: goalData.title,
 description: goalData.description,
 status: goalData.status,
 priority: goalData.priority,
 start_datetime: goalData.start_datetime,
 end_datetime: goalData.end_datetime,
 });
 updateGoal({ ...selectedGoal, ...updatedGoal });
 setIsEditMode(false);
 setIsFormOpen(false);
 setCurrentView('goal-detail');
 return;
 }
 const newGoal = await goalsApi.create({
 title: goalData.title!,
 description: goalData.description!,
 status: goalData.status || StatusType.OUTSTANDING,
 priority: goalData.priority || PriorityType.HIGH,
 start_datetime: goalData.start_datetime,
 end_datetime: goalData.end_datetime,
 });
 addGoal(newGoal);
 setIsCreatingGoal(false);
 } catch (error) {
 console.error('Error saving goal:', error);
 toast.error('Failed to save goal');
 }
 };

 const handleCreateMilestone = async (milestoneData: Omit<Milestone, 'id' | 'tasks' | 'todos'>) => {
 if (!selectedGoalId) return;
 try {
 const createdMilestone = await milestonesApi.create(milestoneData);
 addMilestone(createdMilestone);
 addMilestoneToGoal(createdMilestone, selectedGoalId);
 setIsCreatingMilestone(false);
 } catch (error) {
 console.error('Failed to create milestone:', error);
 try {
 const updatedGoal = await goalsApi.getById(selectedGoalId, {
 include_milestones: true,
 include_tasks: true,
 include_todos: true
 });
 updateGoal(updatedGoal);
 } catch (fetchError) {
 console.error('Failed to revert milestone creation:', fetchError);
 }
 }
 };

 const handleCreateTask = (newTask: Task, goalId: string, milestoneId?: string) => {
 if (!goalId) {
 console.error("Goal ID is missing for task creation through QuickActions.");
 return;
 }
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
 addTaskToMilestoneInGoal({ ...normalizedTask, milestone_id: milestoneId, scope: 'milestone' }, milestoneId, goalId);
 }
 setShowTaskForm(false);
 setSelectedMilestoneId(null);
 setPendingAction(null);
 toast.success(normalizedTask.kind === 'routine' ? 'Routine created' : 'Task created');
 } catch (error) {
 console.error('Failed to optimistically create task via QuickActions:', error);
 toast.error('Failed to create task');
 }
 };

 const handleCreateAction = (
 item: Todo | Subtask,
 kind: 'subtask' | 'todo',
 _actionGoalId: string,
 _actionMilestoneId: string,
 _actionTaskId: string,
 ) => {
 try {
 if (kind === 'todo') {
 updateTodoInGoals(item as Todo);
 } else {
 updateSubtaskInGoals(item as Subtask);
 }
 setShowActionForm(false);
 setSelectedTaskId(null);
 setSelectedTask(null);
 setPendingAction(null);
 toast.success(kind === 'todo' ? 'Todo added' : 'Subtask added');
 } catch (error) {
 console.error('Failed to record action via QuickActions:', error);
 toast.error(`Failed to add ${kind}`);
 }
 };

 const handleGoalDelete = async () => {
 if (!selectedGoal) return;
 try {
 await goalsApi.delete(selectedGoal.id);
 deleteGoalFromStore(selectedGoal.id);
 } catch (error) {
 console.error('Error deleting goal:', error);
 throw error; // Re-throw to let the caller handle it
 }
 };

 const loadGoalForAction = async (goalId: string) => {
 const fullGoal = await goalsApi.getById(goalId, {
 include_milestones: true,
 include_tasks: true,
 include_subtasks: true,
 include_todos: true
 });
 updateGoal(fullGoal);
 setSelectedGoalId(goalId);
 return fullGoal;
 };

 const getSelectableActionTasks = (goal?: Goal | null) => {
 if (!goal) return [];
 const goalTasks = (goal.tasks ?? []).map((task) => ({
 task: { ...task, goal_id: task.goal_id ?? goal.id, scope: task.scope ?? 'goal' } as Task,
 context: task.kind === 'routine' ? 'Goal routine' : 'Goal task',
 }));
 const milestoneTasks = (goal.milestones ?? []).flatMap((milestone) =>
 (milestone.tasks ?? []).map((task) => ({
 task: {
 ...task,
 goal_id: task.goal_id ?? goal.id,
 milestone_id: task.milestone_id ?? milestone.id,
 scope: task.scope ?? 'milestone',
 } as Task,
 context: milestone.title,
 }))
 );
 return [...goalTasks, ...milestoneTasks];
 };

 const openActionFormForTask = (task: Task, action: 'todo' | 'subtask') => {
 setSelectedTaskId(task.id);
 setSelectedTask(task);
 setActionFormKind(action);
 setShowActionForm(true);
 setIsSelectingTask(false);
 setPendingAction(null);
 };

 const continueQuickActionWithGoal = (goal: Goal, action: 'milestone' | 'task' | 'routine' | 'todo' | 'subtask') => {
 setSelectedGoalId(goal.id);
 setSelectedMilestoneId(null);
 setSelectedTask(null);
 setSelectedTaskId(null);

 if (action === 'milestone') {
 setIsCreatingMilestone(true);
 return;
 }

 if (action === 'routine') {
 setShowTaskForm(true);
 return;
 }

 if (action === 'task') {
 const milestones = goal.milestones ?? [];
 if (milestones.length === 1) {
 setSelectedMilestoneId(milestones[0].id);
 setShowTaskForm(true);
 } else {
 setIsSelectingMilestone(true);
 }
 return;
 }

 const selectableTasks = getSelectableActionTasks(goal);
 if (selectableTasks.length === 1) {
 openActionFormForTask(selectableTasks[0].task, action);
 } else {
 setIsSelectingTask(true);
 }
 };

 const handleQuickAction = async (action: 'milestone' | 'task' | 'routine' | 'todo' | 'subtask') => {
 if (goals.length === 0) {
 alert('Please create a goal first');
 return;
 }

 setPendingAction(action);

 if (goals.length === 1) {
 try {
 const fullGoal = await loadGoalForAction(goals[0].id);
 continueQuickActionWithGoal(fullGoal, action);
 } catch (error) {
 console.error('Failed to prepare quick action:', error);
 toast.error('Failed to load goal details');
 setPendingAction(null);
 }
 return;
 }

 setIsSelectingGoal(true);
 };

 const handleGoalSelect = async (goalId: string) => {
 try {
 const fullGoal = await loadGoalForAction(goalId);
 setIsSelectingGoal(false);
 
 if (pendingAction) {
 continueQuickActionWithGoal(fullGoal, pendingAction);
 }
 } catch (error) {
 console.error('Failed to fetch goal details:', error);
 toast.error('Failed to load goal details');
 }
 };

 const handleMilestoneSelect = (milestoneId: string) => {
 setSelectedMilestoneId(milestoneId);
 setIsSelectingMilestone(false);
 
 if (pendingAction === 'task') {
 setShowTaskForm(true);
 } else if (pendingAction === 'todo' || pendingAction === 'subtask') {
 setIsSelectingTask(true);
 }
 };

 const handleTaskSelect = (taskId: string) => {
 const task = getSelectableActionTasks(selectedGoal).find((item) => item.task.id === taskId)?.task;
 if (!task) {
 toast.error('Task not found. Refresh and try again.');
 return;
 }
 
 if (pendingAction === 'todo' || pendingAction === 'subtask') {
 openActionFormForTask(task, pendingAction);
 }
 };

 const handleViewChange = (view: 'dashboard' | 'goal-detail' | 'form' | 'visualization') => {
 setCurrentView(view);
 if (view === 'dashboard') {
 setSelectedGoalId(null);
 setIsFormOpen(false);
 }
 };

 if (isLoadingGoals) {
 return (
 <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--tn-bg)' }}>
 <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--tn-accent)' }}></div>
 </div>
 );
 }

 if (goalsError) {
 return (
 <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--tn-bg)' }}>
 <div style={{ color: 'var(--tn-bad, #c25d63)' }}>Error: {goalsError}</div>
 </div>
 );
 }

 return (
 <div className="min-h-screen flex flex-col font-sans" style={{ background: 'var(--tn-bg)', color: 'var(--tn-fg)' }}>
 <main className="flex-grow mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-6 md:px-10 md:py-8 grid grid-cols-1 xl:grid-cols-[minmax(0,2fr)_minmax(320px,0.85fr)] gap-6">
 <section className="min-w-0">
 {currentView === 'dashboard' ? (
 <DashboardView
 onSelectGoal={(goalId: string) => {
 const goal = goals.find((g: Goal) => g.id === goalId);
 if (goal) {
 handleGoalClick(goal);
 }
 }}
 onGoalUpdate={(updatedGoals: Goal[]) => {
 // This callback is not used in the current implementation
 // but we need to match the interface
 }}
 onCreateGoal={handleAddGoal}
 orderBy={orderBy}
 setOrderBy={setOrderBy}
 />
 ) : currentView === 'goal-detail' && selectedGoal ? (
 <GoalDetailView
 goal={selectedGoal}
 onBack={() => handleViewChange('dashboard')}
 onDelete={handleGoalDelete}
 />
 ) : (
 currentView === 'form' && (
 <GoalForm
 goal={selectedGoal || undefined}
 isEditMode={isEditMode}
 onCancel={handleFormClose}
 onSuccess={handleGoalSubmit}
 />
 )
 )}
 </section>

 <aside className="min-w-0 space-y-6">
 <CalendarWidget />
 <QuickActions
 onAddGoal={handleAddGoal}
 onAddMilestone={() => handleQuickAction('milestone')}
 onAddTask={() => handleQuickAction('task')}
 onAddRoutine={() => handleQuickAction('routine')}
 onAddTodo={() => handleQuickAction('todo')}
 onAddSubtask={() => handleQuickAction('subtask')}
 />
 </aside>

 {/* Selection Modals */}
 {isSelectingGoal && (
 <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
 <div className="bg-card dark:bg-card rounded-xl p-6 max-w-md w-full">
 <h3 className="text-lg font-semibold text-foreground mb-4">Select Goal</h3>
 <div className="space-y-2">
 {[...goals].sort((a, b) => {
 if (orderBy === 'title') return (a.title || '').localeCompare(b.title || '');
 if (orderBy === 'start_desc') return new Date(b.start_datetime || 0).getTime() - new Date(a.start_datetime || 0).getTime();
 if (orderBy === 'start_asc') return new Date(a.start_datetime || 0).getTime() - new Date(b.start_datetime || 0).getTime();
 if (orderBy === 'priority_desc') return priorityWeight(b.priority) - priorityWeight(a.priority);
 if (orderBy === 'priority_asc') return priorityWeight(a.priority) - priorityWeight(b.priority);
 return 0;
 }).map((g: Goal) => (
 <button
 key={g.id}
 onClick={() => handleGoalSelect(g.id)}
 className="w-full text-left p-3 rounded-lg hover:bg-muted dark:hover:bg-card transition-colors"
 >
 <div className="font-medium text-foreground">{g.title}</div>
 <div className="text-sm text-foreground dark:text-muted-foreground/60">{g.description}</div>
 </button>
 ))}
 </div>
 <button
 onClick={() => {
 setIsSelectingGoal(false);
 setPendingAction(null);
 }}
 className="mt-4 w-full px-4 py-2 text-sm font-medium text-foreground dark:text-muted-foreground/60 bg-muted dark:bg-card rounded-lg hover:bg-muted dark:hover:bg-muted"
 >
 Cancel
 </button>
 </div>
 </div>
 )}

 {isSelectingMilestone && selectedGoal && (
 <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
 <div className="bg-card rounded-xl p-6 max-w-md w-full">
 <h3 className="text-lg font-semibold mb-4">Select Milestone</h3>
 <div className="space-y-2">
 {selectedGoal.milestones && selectedGoal.milestones.length > 0 ? (
 selectedGoal.milestones.map((m: Milestone) => (
 <button
 key={m.id}
 onClick={() => handleMilestoneSelect(m.id)}
 className="w-full text-left p-3 rounded-lg hover:bg-muted transition-colors"
 >
 <div className="font-medium text-foreground">{m.title}</div>
 <div className="text-sm text-foreground">{m.description}</div>
 </button>
 ))
 ) : (
 <div className="text-center py-4 text-muted-foreground">
 No milestones available. Create a milestone first.
 </div>
 )}
 </div>
 <button
 onClick={() => {
 setIsSelectingMilestone(false);
 setPendingAction(null);
 }}
 className="mt-4 w-full px-4 py-2 text-sm font-medium text-foreground bg-muted rounded-lg hover:bg-muted"
 >
 Cancel
 </button>
 </div>
 </div>
 )}

 {isSelectingTask && selectedGoal && (
 <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
 <div className="bg-card rounded-xl p-6 max-w-md w-full">
 <h3 className="text-lg font-semibold mb-4">Select Task</h3>
 <div className="space-y-2">
 {getSelectableActionTasks(selectedGoal).map(({ task, context }) => (
 <button
 key={task.id}
 onClick={() => handleTaskSelect(task.id)}
 className="w-full text-left p-3 rounded-lg hover:bg-muted transition-colors"
 >
 <div className="font-medium text-foreground">{task.title}</div>
 <div className="text-sm text-muted-foreground">{context} · {task.description || 'No description'}</div>
 </button>
 ))}
 {getSelectableActionTasks(selectedGoal).length === 0 && (
 <div className="text-center py-4 text-muted-foreground">
 No routines or tasks available. Create a routine or task first.
 </div>
 )}
 </div>
 <button
 onClick={() => {
 setIsSelectingTask(false);
 setPendingAction(null);
 }}
 className="mt-4 w-full px-4 py-2 text-sm font-medium text-foreground bg-muted rounded-lg hover:bg-muted"
 >
 Cancel
 </button>
 </div>
 </div>
 )}

 {/* Creation Modals */}
 <Modal
 open={isCreatingGoal}
 title="Create New Goal"
 onClose={() => setIsCreatingGoal(false)}
 maxWidth="2xl"
 >
 <GoalForm
 onSuccess={handleGoalSubmit}
 onCancel={() => setIsCreatingGoal(false)}
 />
 </Modal>

 {isCreatingMilestone && selectedGoalId && (
 <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
 <div className="bg-card rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
 <h3 className="text-lg font-semibold mb-4">Create New Milestone</h3>
 <MilestoneForm
 goalId={selectedGoalId}
 onSuccess={handleCreateMilestone}
 onCancel={() => setIsCreatingMilestone(false)}
 />
 </div>
 </div>
 )}

 {showTaskForm && selectedGoal && (pendingAction !== 'task' || selectedMilestoneId) && (
 <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
 <div className="bg-card rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
 <h3 className="text-lg font-semibold mb-4">{pendingAction === 'routine' ? 'Create Goal Routine' : 'Create Milestone Task'}</h3>
 <TaskForm
 goalId={selectedGoal.id}
 milestoneId={pendingAction === 'task' ? selectedMilestoneId ?? undefined : undefined}
 initialData={pendingAction === 'routine'
 ? { kind: 'routine', scope: 'goal', status: StatusType.STARTED, priority: PriorityType.MEDIUM }
 : { kind: 'project', scope: 'milestone', status: StatusType.OUTSTANDING, priority: PriorityType.MEDIUM }}
 onSuccess={handleCreateTask}
 onCancel={() => {
 setShowTaskForm(false);
 setSelectedMilestoneId(null);
 setPendingAction(null);
 }}
 />
 </div>
 </div>
 )}

 {showActionForm && selectedTask && selectedGoal && (
 <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
 <div className="bg-card rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
 <h3 className="text-lg font-semibold mb-4">Add Action</h3>
 <ActionForm
 goalId={selectedGoal.id}
 milestoneId={selectedTask.milestone_id ?? ''}
 taskId={selectedTask.id}
 defaultKind={actionFormKind}
 onSuccess={handleCreateAction}
 onCancel={() => {
 setShowActionForm(false);
 setSelectedTask(null);
 setSelectedTaskId(null);
 setPendingAction(null);
 }}
 />
 </div>
 </div>
 )}

 {/* Delete Dialog */}
 {isDeleteDialogOpen && selectedGoal && (
 <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
 <div className="bg-card rounded-lg p-6 max-w-md w-full">
 <h3 className="text-lg font-semibold mb-4">Delete Goal</h3>
 <p className="text-foreground mb-6">
 Are you sure you want to delete"{selectedGoal.title}"? This action cannot be undone.
 </p>
 <div className="flex justify-end space-x-4">
 <button
 onClick={() => setIsDeleteDialogOpen(false)}
 className="px-4 py-2 text-foreground hover:text-foreground"
 disabled={isDeleting}
 >
 Cancel
 </button>
 <button
 onClick={() => handleGoalDelete()}
 className="btn" style={{background:'var(--tn-bad, #c25d63)', color:'#fff', opacity: 0.95}}
 disabled={isDeleting}
 >
 {isDeleting ? 'Deleting...' : 'Delete'}
 </button>
 </div>
 </div>
 </div>
 )}
 </main>
 </div>
 );
};

export default Home;
