"use client";

import React, { useState, useEffect } from 'react';
import { withAuth } from '@/hoc/withAuth';
import dynamic from 'next/dynamic';
import { GoalItem as Goal, MilestoneItem as Milestone, TaskItem as Task, TodoItem as Todo, SubtaskItem as Subtask } from '@/lib/types';
import { goalsApi, milestonesApi, tasksApi, todosApi } from '@/lib/api';
import { useStore } from '@/store/useStore';
import { useRouter } from 'next/navigation';
import { StatusType, PriorityType } from '@/types';
import { useSession } from 'next-auth/react';

const DashboardView = dynamic(() => import('@/components/dashboard/DashboardView').then(m => m.DashboardView));
const GoalDetailView = dynamic(() => import('@/components/dashboard/GoalDetailView').then(m => m.GoalDetailView));
const CalendarWidget = dynamic(() => import('@/components/dashboard/CalendarWidget').then(m => m.CalendarWidget));
const QuickActions = dynamic(() => import('@/components/dashboard/QuickActions').then(m => m.QuickActions));
const GoalForm = dynamic(() => import('@/components/dashboard/GoalForm').then(m => m.GoalForm), { ssr: false });
const MilestoneForm = dynamic(() => import('@/components/dashboard/MilestoneForm').then(m => m.MilestoneForm));
const TaskForm = dynamic(() => import('@/components/dashboard/TaskForm').then(m => m.TaskForm));
const TodoForm = dynamic(() => import('@/components/dashboard/TodoForm').then(m => m.TodoForm));
const SubtaskForm = dynamic(() => import('@/components/dashboard/SubtaskForm').then(m => m.SubtaskForm));
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
  const [showTodoForm, setShowTodoForm] = useState(false);
  const [showSubtaskForm, setShowSubtaskForm] = useState(false);
  
  // Selected Item States
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);

  // Delete States
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Store Integration
  const { 
    goals, 
    isLoadingGoals, 
    goalsError,
    fetchGoals,
    addGoal,
    updateGoal,
    deleteGoal: deleteGoalFromStore,
    addMilestone,
    // Add new store actions for optimistic updates
    addMilestoneToGoal,
    addTaskToMilestoneInGoal,
    addTodoToTaskInMilestoneInGoal,
    addSubtaskToTaskInMilestoneInGoal,
  } = useStore();

  // Order state for goals (shared with DashboardView and selection modals)
  const [orderBy, setOrderBy] = useState<'title' | 'start_desc' | 'start_asc' | 'priority_desc' | 'priority_asc'>('title');
  const selectedGoal = selectedGoalId ? goals.find((goal: Goal) => goal.id === selectedGoalId) : null;

  useEffect(() => {
    if (status === 'authenticated') {
      fetchGoals();
    }
  }, [status, fetchGoals]);

  // Order state for goals (shared with DashboardView and selection modals)

  if (status === 'loading' || isLoadingGoals) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">You are not authenticated.</div>
      </div>
    );
  }

  if (goalsError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
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
    }
  };

  const handleCreateMilestone = async (milestoneData: Omit<Milestone, 'id' | 'tasks' | 'todos'>) => {
    if (!selectedGoalId) return;
    try {
      const createdMilestone = await milestonesApi.create(milestoneData);
      // Optimistically update the store
      // 1. Add milestone to milestones array in store
      if (typeof addMilestone === 'function') {
        addMilestone(createdMilestone);
      }
      // 2. Update the relevant goal's milestones array in the store
      if (selectedGoal) {
        updateGoal({
          ...selectedGoal,
          milestones: [
            ...(selectedGoal.milestones || []),
            createdMilestone
          ]
        });
      }
      // Optimistically add the milestone to the goal in the store
      addMilestoneToGoal(createdMilestone, selectedGoalId);
      setIsCreatingMilestone(false);
      // Optionally, fetch the updated goal in the background for consistency
      goalsApi.getById(selectedGoalId, { include_milestones: true }).then(updateGoal).catch(() => {});
    } catch (error) {
      console.error('Failed to create milestone:', error);
      // On error, we could revert the optimistic update by refetching the goal
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

  // Updated to use optimistic store action
  const handleCreateTodo = (newTodo: Todo, goalId: string, milestoneId: string, taskId: string) => {
    if (!taskId || !milestoneId || !goalId) {
      console.error("Task ID, Milestone ID, or Goal ID is missing for todo creation through QuickActions.");
      return;
    }
    try {
      addTodoToTaskInMilestoneInGoal(newTodo, taskId, milestoneId, goalId);
      setShowTodoForm(false);
      setSelectedTaskId(null); // Reset selectedTaskId
      setSelectedTask(null); // Reset selectedTask object
      setPendingAction(null); // Reset pending action
    } catch (error) {
      console.error('Failed to optimistically create todo via QuickActions:', error);
      // Potentially set an error state for UI feedback
    }
  };

  // Updated to use optimistic store action
  const handleCreateSubtask = (newSubtask: Subtask, goalId: string, milestoneId: string, taskId: string) => {
    if (!taskId || !milestoneId || !goalId) {
      console.error("Task ID, Milestone ID, or Goal ID is missing for subtask creation through QuickActions.");
      return;
    }
    try {
      // Ensure newSubtask is of the correct type for the store action if SubtaskItem is different from Task
      addSubtaskToTaskInMilestoneInGoal(newSubtask, taskId, milestoneId, goalId);
      setShowSubtaskForm(false);
      setSelectedTaskId(null); // Reset selectedTaskId
      setSelectedTask(null); // Reset selectedTask object
      setPendingAction(null); // Reset pending action
    } catch (error) {
      console.error('Failed to optimistically create subtask via QuickActions:', error);
      // Potentially set an error state for UI feedback
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
            setShowTodoForm(true);
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
    
    if (pendingAction === 'todo') {
      setShowTodoForm(true);
    } else if (pendingAction === 'subtask') {
      setShowSubtaskForm(true);
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (goalsError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-500">Error: {goalsError}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 font-sans text-gray-900">
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
              onEdit={handleEditGoal}
              onDelete={handleGoalDelete}
              onViewChange={handleViewChange}
            />
          ) : (
            currentView === 'form' && (
              <GoalForm
                goal={selectedGoal || undefined}
                isEditMode={isEditMode}
                onClose={handleFormClose}
                onSubmit={handleGoalSubmit}
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
            <div className="bg-white rounded-xl p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold mb-4">Select Goal</h3>
              <div className="space-y-2">
                {[...goals].sort((a, b) => {
                  if (orderBy === 'title') return (a.title || '').localeCompare(b.title || '');
                  if (orderBy === 'start_desc') return new Date(b.start_datetime || 0).getTime() - new Date(a.start_datetime || 0).getTime();
                  if (orderBy === 'start_asc') return new Date(a.start_datetime || 0).getTime() - new Date(b.start_datetime || 0).getTime();
                  if (orderBy === 'priority_desc') return (b.priority || '').localeCompare(a.priority || '');
                  if (orderBy === 'priority_asc') return (a.priority || '').localeCompare(b.priority || '');
                  return 0;
                }).map((g: Goal) => (
                  <button
                    key={g.id}
                    onClick={() => handleGoalSelect(g.id)}
                    className="w-full text-left p-3 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="font-medium text-gray-900">{g.title}</div>
                    <div className="text-sm text-gray-600">{g.description}</div>
                  </button>
                ))}
              </div>
              <button
                onClick={() => {
                  setIsSelectingGoal(false);
                  setPendingAction(null);
                }}
                className="mt-4 w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {isSelectingMilestone && selectedGoal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold mb-4">Select Milestone</h3>
              <div className="space-y-2">
                {selectedGoal.milestones && selectedGoal.milestones.length > 0 ? (
                  selectedGoal.milestones.map((m: Milestone) => (
                    <button
                      key={m.id}
                      onClick={() => handleMilestoneSelect(m.id)}
                      className="w-full text-left p-3 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="font-medium text-gray-900">{m.title}</div>
                      <div className="text-sm text-gray-600">{m.description}</div>
                    </button>
                  ))
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    No milestones available. Create a milestone first.
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  setIsSelectingMilestone(false);
                  setPendingAction(null);
                }}
                className="mt-4 w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {isSelectingTask && selectedMilestoneId && selectedGoal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold mb-4">Select Task</h3>
              <div className="space-y-2">
                {selectedGoal.milestones
                  .find((m: Milestone) => m.id === selectedMilestoneId)
                  ?.tasks.map((t: Task) => (
                    <button
                      key={t.id}
                      onClick={() => handleTaskSelect(t.id)}
                      className="w-full text-left p-3 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="font-medium text-gray-900">{t.title}</div>
                      <div className="text-sm text-gray-600">{t.description}</div>
                    </button>
                  ))}
              </div>
              <button
                onClick={() => {
                  setIsSelectingTask(false);
                  setPendingAction(null);
                }}
                className="mt-4 w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Creation Modals */}
        {isCreatingGoal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">Create New Goal</h3>
              <GoalForm
                onSuccess={handleGoalSubmit}
                onCancel={() => setIsCreatingGoal(false)}
                onClose={() => setIsCreatingGoal(false)}
              />
            </div>
          </div>
        )}

        {isCreatingMilestone && selectedGoalId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
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
            <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
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

        {showTodoForm && selectedTask && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">Create New Todo</h3>
              <TodoForm
                goalId={selectedGoal!.id} // selectedGoal should be non-null if selectedTask is set
                milestoneId={selectedTask.milestone_id!} // selectedTask should have milestone_id
                taskId={selectedTask.id}
                onSuccess={handleCreateTodo}
                onCancel={() => {
                  setShowTodoForm(false);
                  setSelectedTask(null);
                  setSelectedTaskId(null);
                  setPendingAction(null);
                }}
              />
            </div>
          </div>
        )}

        {showSubtaskForm && selectedTask && selectedGoal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">Create New Subtask</h3>
              <SubtaskForm
                goalId={selectedGoal!.id} // selectedGoal should be non-null
                milestoneId={selectedTask.milestone_id!} // selectedTask should have milestone_id
                taskId={selectedTask.id}
                onSuccess={handleCreateSubtask}
                onCancel={() => {
                  setShowSubtaskForm(false);
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
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold mb-4">Delete Goal</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete "{selectedGoal.title}"? This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setIsDeleteDialogOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleGoalDelete()}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
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
