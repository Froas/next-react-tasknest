"use client";

import React, { useState, useEffect } from 'react';
import { withAuth } from '@/hoc/withAuth';
import { Header } from '@/components/dashboard/Header';
import { DashboardView } from '@/components/dashboard/DashboardView';
import { GoalDetailView } from '@/components/dashboard/GoalDetailView';
import { CalendarWidget } from '@/components/dashboard/CalendarWidget';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { GoalItem as Goal, MilestoneItem as Milestone, TaskItem as Task, TodoItem as Todo, SubtaskItem as Subtask } from '@/lib/types';
import { goalsApi, milestonesApi, tasksApi, todosApi } from '@/lib/api';
import { GoalForm } from '@/components/dashboard/GoalForm';
import { MilestoneForm } from '@/components/dashboard/MilestoneForm';
import { TaskForm } from '@/components/dashboard/TaskForm';
import { TodoForm } from '@/components/dashboard/TodoForm';
import { SubtaskForm } from '@/components/dashboard/SubtaskForm';
import { QuickGoalForm } from '@/components/dashboard/QuickGoalForm';
import { useStore } from '@/store/useStore';
import { useRouter } from 'next/navigation';
import { StatusType, PriorityType } from '@/types';
import { useSession } from 'next-auth/react';

const Home = () => {
  const { data: session } = useSession();
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
  } = useStore();

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const handleGoalClick = (goal: Goal) => {
    setSelectedGoalId(goal.id);
    setCurrentView('goal-detail');
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
      const updatedGoal = await goalsApi.getById(selectedGoalId);
      updateGoal(updatedGoal);
      setIsCreatingMilestone(false);
    } catch (error) {
      console.error('Failed to create milestone:', error);
    }
  };

  const handleCreateTask = async (taskData: Partial<Task>) => {
    if (!selectedMilestoneId) return;
    try {
      const taskToCreate: Omit<Task, 'id'> = {
        title: taskData.title!,
        description: taskData.description!,
        status: taskData.status || StatusType.OUTSTANDING,
        priority: taskData.priority || PriorityType.MEDIUM,
        due_date: taskData.due_date,
        start_datetime: taskData.start_datetime,
        end_datetime: taskData.end_datetime,
        milestone_id: selectedMilestoneId,
        todos: [],
        subtasks: []
      };
      const createdTask = await tasksApi.create(taskToCreate);
      const updatedGoal = await goalsApi.getById(selectedGoalId!);
      updateGoal(updatedGoal);
      setShowTaskForm(false);
      setSelectedMilestone(null);
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  const handleCreateTodo = async (todoData: Partial<Todo>) => {
    if (!selectedTask) return;
    try {
      const todoToCreate: Omit<Todo, 'id'> = {
        title: todoData.title!,
        description: todoData.description!,
        status: todoData.status || StatusType.OUTSTANDING,
        priority: todoData.priority || PriorityType.MEDIUM,
        due_date: todoData.due_date,
        start_datetime: todoData.start_datetime,
        end_datetime: todoData.end_datetime,
        repeat_interval: todoData.repeat_interval,
        next_due_date: todoData.next_due_date,
        task_id: selectedTask.id
      };
      const createdTodo = await todosApi.create(todoToCreate);
      const updatedGoal = await goalsApi.getById(selectedGoalId!);
      updateGoal(updatedGoal);
      setShowTodoForm(false);
      setSelectedTask(null);
    } catch (error) {
      console.error('Failed to create todo:', error);
    }
  };

  const handleCreateSubtask = async (subtaskData: Partial<Task>) => {
    if (!selectedTask) return;
    try {
      const subtaskToCreate: Omit<Task, 'id'> = {
        title: subtaskData.title!,
        description: subtaskData.description!,
        status: subtaskData.status || StatusType.OUTSTANDING,
        priority: subtaskData.priority || PriorityType.MEDIUM,
        due_date: subtaskData.due_date,
        start_datetime: subtaskData.start_datetime,
        end_datetime: subtaskData.end_datetime,
        milestone_id: selectedTask.milestone_id,
        parent_id: selectedTask.id,
        todos: [],
        subtasks: []
      };
      const createdSubtask = await tasksApi.create(subtaskToCreate);
      const updatedGoal = await goalsApi.getById(selectedGoalId!);
      updateGoal(updatedGoal);
      setShowSubtaskForm(false);
      setSelectedTask(null);
    } catch (error) {
      console.error('Failed to create subtask:', error);
    }
  };

  const handleGoalDelete = async (goalId: string) => {
    try {
      setIsDeleting(true);
      await goalsApi.delete(goalId);
      deleteGoalFromStore(goalId);
      setIsDeleteDialogOpen(false);
      setCurrentView('dashboard');
    } catch (error) {
      console.error('Error deleting goal:', error);
    } finally {
      setIsDeleting(false);
    }
  };

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
    } else if (action === 'todo' || action === 'subtask') {
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

  const selectedGoal = selectedGoalId ? goals.find((goal: Goal) => goal.id === selectedGoalId) : null;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 font-sans text-gray-900">
      <Header/>

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
              onGoalUpdate={updateGoal}
              onCreateGoal={handleAddGoal}
            />
          ) : currentView === 'goal-detail' && selectedGoal ? (
            <GoalDetailView
              goal={selectedGoal}
              onBack={() => handleViewChange('dashboard')}
              onEdit={handleEditGoal}
              onDelete={() => setIsDeleteDialogOpen(true)}
              onViewChange={handleViewChange}
            />
          ) : (
            currentView === 'form' && (
              <GoalForm
                goal={selectedGoal}
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
                {goals.map((g: Goal) => (
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
                taskId={selectedTask.id}
                onSuccess={handleCreateTodo}
                onCancel={() => {
                  setShowTodoForm(false);
                  setSelectedTask(null);
                }}
              />
            </div>
          </div>
        )}

        {showSubtaskForm && selectedTask && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">Create New Subtask</h3>
              <SubtaskForm
                taskId={selectedTask.id}
                onSuccess={handleCreateSubtask}
                onCancel={() => {
                  setShowSubtaskForm(false);
                  setSelectedTask(null);
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
                  onClick={() => handleGoalDelete(selectedGoal.id)}
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

export default withAuth(Home);
