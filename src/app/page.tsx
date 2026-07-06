"use client";

import React, { useState, useEffect } from 'react';
import { withAuth } from '@/hoc/withAuth';
import dynamic from 'next/dynamic';
import { GoalItem as Goal, MilestoneItem as Milestone, TaskItem as Task, TodoItem as Todo, SubtaskItem as Subtask } from '@/lib/types';
import { goalsApi, milestonesApi, tasksApi, todosApi } from '@/lib/api';
import { useStore } from '@/store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { toast } from '@/store/useToast';
import { usePersistentState } from '@/lib/usePersistentState';
import { useRouter } from 'next/navigation';
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
const QuickGoalForm = dynamic(() => import('@/components/dashboard/QuickGoalForm').then(m => m.QuickGoalForm), { ssr: false });
const EventForm = dynamic(() => import('@/components/dashboard/EventForm').then(m => m.EventForm), { ssr: false });

const Home = () => {
 const { data: session, status } = useSession();
 const router = useRouter();
 
 // View States
 const [currentView, setCurrentView] = useState<'dashboard' | 'goal-detail' | 'form' | 'visualization'>('dashboard');
 const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
 
 // Form States
 const [isFormOpen, setIsFormOpen] = useState(false);
 const [isEditMode, setIsEditMode] = useState(false);
 const [isCreatingGoal, setIsCreatingGoal] = useState(false);
 const [isCreatingQuickGoal, setIsCreatingQuickGoal] = useState(false);
 const [isCreatingMilestone, setIsCreatingMilestone] = useState(false);
 const [isCreatingTask, setIsCreatingTask] = useState(false);
 const [isCreatingTodo, setIsCreatingTodo] = useState(false);
 
 // Selection States
 const [isSelectingGoal, setIsSelectingGoal] = useState(false);
 const [isSelectingMilestone, setIsSelectingMilestone] = useState(false);
 const [isSelectingTask, setIsSelectingTask] = useState(false);
 const [pendingAction, setPendingAction] = useState<'milestone' | 'task' | 'todo' | 'subtask' | null>(null);
 const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(null);
 const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
 
 // Form Visibility States
 const [showTaskForm, setShowTaskForm] = useState(false);
 const [showActionForm, setShowActionForm] = useState(false);
 const [actionFormKind, setActionFormKind] = useState<'subtask' | 'todo'>('subtask');
 
 // Selected Item States
 const [selectedTask, setSelectedTask] = useState<Task | null>(null);
 const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);

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
 addTodoToTaskInMilestoneInGoal,
 addSubtaskToTaskInMilestoneInGoal,
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
 addTodoToTaskInMilestoneInGoal: s.addTodoToTaskInMilestoneInGoal,
 addSubtaskToTaskInMilestoneInGoal: s.addSubtaskToTaskInMilestoneInGoal,
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
 <div className="min-h-screen bg-muted dark:bg-card flex items-center justify-center">
 <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
 </div>
 );
 }

 if (status === 'unauthenticated') {
 return (
 <div className="min-h-screen bg-muted flex items-center justify-center">
 <div className="text-muted-foreground">You are not authenticated.</div>
 </div>
 );
 }

 if (goalsError) {
 return (
 <div className="min-h-screen bg-muted flex items-center justify-center">
 <div className="text-red-500">Error: {goalsError}</div>
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
 setIsCreatingGoal(true);
 };

 const handleEditGoal = () => {
 setIsEditMode(true);
 setIsFormOpen(true);
 setCurrentView('form');
 };

 const handleFormClose = () => {
 setIsFormOpen(false);
 setCurrentView('dashboard');
 };

 const handleGoalSubmit = async (goalData: Partial<Goal>) => {
 try {
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

 // Updated to use optimistic store action
 const handleCreateTask = (newTask: Task, goalId: string, milestoneId: string) => {
 if (!milestoneId || !goalId) {
 console.error("Milestone ID or Goal ID is missing for task creation through QuickActions.");
 return;
 }
 try {
 addTaskToMilestoneInGoal(newTask, milestoneId, goalId);
 setShowTaskForm(false);
 setSelectedMilestoneId(null); // Reset selectedMilestoneId
 setPendingAction(null); // Reset pending action
 // setSelectedMilestone(null); // This state was also used, ensure consistency if needed
 } catch (error) {
 console.error('Failed to optimistically create task via QuickActions:', error);
 // Potentially set an error state for UI feedback
 }
 };

 const handleCreateAction = (
 item: Todo | Subtask,
 kind: 'subtask' | 'todo',
 actionGoalId: string,
 actionMilestoneId: string,
 actionTaskId: string,
 ) => {
 try {
 if (kind === 'todo') {
 addTodoToTaskInMilestoneInGoal(item as Todo, actionTaskId, actionMilestoneId, actionGoalId);
 } else {
 addSubtaskToTaskInMilestoneInGoal(item as Subtask, actionTaskId, actionMilestoneId, actionGoalId);
 }
 setShowActionForm(false);
 setSelectedTaskId(null);
 setSelectedTask(null);
 setPendingAction(null);
 } catch (error) {
 console.error('Failed to record action via QuickActions:', error);
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

 // Improved quick action for 'todo': if only one goal, milestone, and task, open TodoForm directly
 const handleQuickAction = (action: 'milestone' | 'task' | 'todo' | 'subtask') => {
 if (goals.length === 0) {
 alert('Please create a goal first');
 return;
 }

 setPendingAction(action);

 if (action === 'milestone') {
 if (goals.length === 1) {
 setSelectedGoalId(goals[0].id);
 setIsCreatingMilestone(true);
 } else {
 setIsSelectingGoal(true);
 }
 } else if (action === 'task') {
 if (goals.length === 1) {
 setSelectedGoalId(goals[0].id);
 setIsSelectingMilestone(true);
 } else {
 setIsSelectingGoal(true);
 }
 } else if (action === 'todo') {
 // Quick add todo: if only one goal, one milestone, one task, open TodoForm directly
 if (goals.length === 1) {
 const goal = goals[0];
 setSelectedGoalId(goal.id);
 if (goal.milestones && goal.milestones.length === 1) {
 const milestone = goal.milestones[0];
 setSelectedMilestoneId(milestone.id);
 if (milestone.tasks && milestone.tasks.length === 1) {
 const task = milestone.tasks[0];
 setSelectedTask(task);
 setActionFormKind('todo');
 setShowActionForm(true);
 setPendingAction(null);
 return;
 } else {
 setIsSelectingTask(true);
 return;
 }
 } else {
 setIsSelectingMilestone(true);
 return;
 }
 } else {
 setIsSelectingGoal(true);
 return;
 }
 } else if (action === 'subtask') {
 if (goals.length === 1) {
 setSelectedGoalId(goals[0].id);
 setIsSelectingMilestone(true);
 } else {
 setIsSelectingGoal(true);
 }
 }
 };

 const handleGoalSelect = async (goalId: string) => {
 try {
 const fullGoal = await goalsApi.getById(goalId, {
 include_milestones: true,
 include_tasks: true,
 include_todos: true
 });
 
 setSelectedGoalId(goalId);
 setIsSelectingGoal(false);
 updateGoal(fullGoal);
 
 if (pendingAction === 'milestone') {
 setIsCreatingMilestone(true);
 } else if (pendingAction === 'task') {
 setIsSelectingMilestone(true);
 } else if (pendingAction === 'todo' || pendingAction === 'subtask') {
 setIsSelectingMilestone(true);
 }
 } catch (error) {
 console.error('Failed to fetch goal details:', error);
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
 setSelectedTaskId(taskId);
 setIsSelectingTask(false);
 
 if (pendingAction === 'todo' || pendingAction === 'subtask') {
 setActionFormKind(pendingAction);
 setShowActionForm(true);
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
 <div className="min-h-screen bg-muted flex items-center justify-center">
 <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
 </div>
 );
 }

 if (goalsError) {
 return (
 <div className="min-h-screen bg-muted flex items-center justify-center">
 <div className="text-red-500">Error: {goalsError}</div>
 </div>
 );
 }

 return (
 <div className="min-h-screen flex flex-col bg-muted dark:bg-card font-sans text-foreground">
 <main className="flex-grow container mx-auto p-6 md:p-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
 <section className="lg:col-span-2">
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

 <aside className="lg:col-span-1 space-y-6">
 <CalendarWidget />
 <QuickActions
 onAddGoal={handleAddGoal}
 onAddMilestone={() => handleQuickAction('milestone')}
 onAddTask={() => handleQuickAction('task')}
 onAddTodo={() => handleQuickAction('todo')}
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

 {isSelectingTask && selectedMilestoneId && selectedGoal && (
 <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
 <div className="bg-card rounded-xl p-6 max-w-md w-full">
 <h3 className="text-lg font-semibold mb-4">Select Task</h3>
 <div className="space-y-2">
 {selectedGoal.milestones
 .find((m: Milestone) => m.id === selectedMilestoneId)
 ?.tasks.map((t: Task) => (
 <button
 key={t.id}
 onClick={() => handleTaskSelect(t.id)}
 className="w-full text-left p-3 rounded-lg hover:bg-muted transition-colors"
 >
 <div className="font-medium text-foreground">{t.title}</div>
 <div className="text-sm text-foreground">{t.description}</div>
 </button>
 ))}
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
 {isCreatingGoal && (
 <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
 <div className="bg-card rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
 <h3 className="text-lg font-semibold mb-4">Create New Goal</h3>
 <GoalForm
 onSuccess={handleGoalSubmit}
 onCancel={() => setIsCreatingGoal(false)}
 />
 </div>
 </div>
 )}

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

 {showTaskForm && selectedMilestoneId && selectedGoal && (
 <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
 <div className="bg-card rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
 <h3 className="text-lg font-semibold mb-4">Create New Task</h3>
 <TaskForm
 goalId={selectedGoal.id}
 milestoneId={selectedMilestoneId}
 onSuccess={handleCreateTask}
 onCancel={() => {
 setShowTaskForm(false);
 setSelectedMilestoneId(null);
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
 milestoneId={selectedTask.milestone_id!}
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
