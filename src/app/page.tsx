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

const Home = () => {
  const [currentView, setCurrentView] = useState<'dashboard' | 'goal-detail'>('dashboard');
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // States for form creation
  const [isCreatingGoal, setIsCreatingGoal] = useState(false);
  const [isCreatingQuickGoal, setIsCreatingQuickGoal] = useState(false);
  const [isCreatingMilestone, setIsCreatingMilestone] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [isCreatingTodo, setIsCreatingTodo] = useState(false);

  // States for selection
  const [isSelectingGoal, setIsSelectingGoal] = useState(false);
  const [isSelectingMilestone, setIsSelectingMilestone] = useState(false);
  const [isSelectingTask, setIsSelectingTask] = useState(false);
  const [pendingAction, setPendingAction] = useState<'milestone' | 'task' | 'todo' | 'subtask' | null>(null);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showTodoForm, setShowTodoForm] = useState(false);
  const [showSubtaskForm, setShowSubtaskForm] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    setIsLoading(true);
    try {
      const data = await goalsApi.getAll();
      // Get full data for each goal including milestones
      const fullGoals = await Promise.all(
        data.map(goal => goalsApi.getById(goal.id))
      );
      setGoals(fullGoals);
    } catch (error) {
      console.error('Failed to fetch goals:', error);
    } finally {
      setIsLoading(false);
    }
  };


  const handleCreateGoal = async (newGoal: Goal) => {
    try {

      const createdGoal = await goalsApi.create(newGoal);

      setGoals(prevGoals => [...prevGoals, createdGoal]);

      setIsCreatingGoal(false);
      setIsCreatingQuickGoal(false);
    } catch (error) {
      console.error('Failed to create goal:', error);
    }
  };

  const handleCreateQuickGoal = async (newGoal: Goal) => {
    try {
      const createdGoal = await goalsApi.create(newGoal);
      setGoals(prevGoals => [...prevGoals, createdGoal]);
      setIsCreatingQuickGoal(false);
    } catch (error) {
      console.error('Failed to create goal:', error);
    }
  };

  const handleCreateMilestone = async (newMilestone: Milestone) => {
    if (!selectedGoalId) return;
    try {
      const createdMilestone = await milestonesApi.create({
        ...newMilestone,
        goal_id: selectedGoalId
      });
      const updatedGoal = await goalsApi.getById(selectedGoalId);
      setGoals(prevGoals => prevGoals.map(goal => 
        goal.id === selectedGoalId ? updatedGoal : goal
      ));
      setIsCreatingMilestone(false);
    } catch (error) {
      console.error('Failed to create milestone:', error);
    }
  };

  const handleCreateTask = async (item: Task | Todo) => {
    if (!selectedGoalId || !selectedMilestoneId || 'todos' in item) return;
    const task = item as Task;
    try {
      const createdTask = await tasksApi.create({
        ...task,
        milestone_id: selectedMilestoneId,
        todos: [],
        subtasks: []
      });
      
      const updatedGoal = await goalsApi.getById(selectedGoalId);
      setGoals(prevGoals => prevGoals.map(goal => 
        goal.id === selectedGoalId ? updatedGoal : goal
      ));
      
      setIsCreatingTask(false);
      setPendingAction(null);
      setSelectedMilestoneId(null);
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  const handleCreateTodo = async (item: Task | Todo) => {
    if ('todos' in item) return; // Check if it's a Todo, not a Task
    const todo = item as Todo; // Cast to Todo type since we've already checked it's a Todo
    try {
      const createdTodo = await todosApi.create(todo);
      await fetchGoals(); // Update all goals since todo can be related to any goal
      setIsCreatingTodo(false);
    } catch (error) {
      console.error('Failed to create todo:', error);
    }
  };

  // Update handlers for QuickActions
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

  // Goal selection handler
  const handleGoalSelect = async (goalId: string) => {
    try {
      // Get full goal data with milestones
      const fullGoal = await goalsApi.getById(goalId, {
        include_milestones: true,
        include_tasks: true,
        include_todos: true
      });
      
      setSelectedGoalId(goalId);
      setIsSelectingGoal(false);
      
      if (pendingAction === 'milestone') {
        setIsCreatingMilestone(true);
      } else if (pendingAction === 'task') {
        // Update goals state with full goal data
        setGoals(prevGoals => prevGoals.map(goal => 
          goal.id === goalId ? fullGoal : goal
        ));
        setIsSelectingMilestone(true);
      } else if (pendingAction === 'todo' || pendingAction === 'subtask') {
        // Update goals state with full goal data
        setGoals(prevGoals => prevGoals.map(goal => 
          goal.id === goalId ? fullGoal : goal
        ));
        setIsSelectingMilestone(true);
      }
    } catch (error) {
      console.error('Failed to fetch goal details:', error);
    }
  };

  // Milestone selection handler
  const handleMilestoneSelect = (milestoneId: string) => {
    setSelectedMilestoneId(milestoneId);
    setIsSelectingMilestone(false);
    
    if (pendingAction === 'task') {
      setCurrentView('goal-detail');
      setTimeout(() => {
        const goalDetailView = document.querySelector('[data-testid="goal-detail-view"]');
        if (goalDetailView) {
          const addTaskButton = goalDetailView.querySelector('[data-testid="add-task-button"]');
          if (addTaskButton) {
            (addTaskButton as HTMLButtonElement).click();
          }
        }
      }, 100);
    } else if (pendingAction === 'todo' || pendingAction === 'subtask') {
      setIsSelectingTask(true);
    }
  };

  // Task selection handler
  const handleTaskSelect = (taskId: string) => {
    setSelectedTaskId(taskId);
    setIsSelectingTask(false);
    setIsCreatingTodo(true);
  };

  // Add back previously removed functions
  const handleSelectGoal = (goalId: string) => {
    setSelectedGoalId(goalId);
    setCurrentView('goal-detail');
  };

  const handleBackToDashboard = () => {
    setSelectedGoalId(null);
    setCurrentView('dashboard');
  };

  const handleGoalUpdate = (updatedGoal: Goal) => {
    setGoals(prevGoals => prevGoals.map(goal => 
      goal.id === updatedGoal.id ? updatedGoal : goal
    ));
  };

  const handleGoalsUpdate = (updatedGoals: Goal[]) => {
    setGoals(updatedGoals);
  };

  const selectedGoal = selectedGoalId ? goals.find((goal) => goal.id === selectedGoalId) : null;

  const handleCreateSubtask = async (subtask: Subtask) => {
    try {
      const updatedTask = await tasksApi.get(selectedTask!.id, true, true);
      setSelectedTask(updatedTask);
      setShowSubtaskForm(false);
    } catch (err) {
      console.error('Failed to update task with new subtask:', err);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 font-sans text-gray-900">
      <Header/>

      <main className="flex-grow container mx-auto p-6 md:p-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2">
          {isLoading ? (
            <div className="flex justify-center items-center h-64 text-gray-600 text-lg">Loading goals...</div>
          ) : currentView === 'dashboard' ? (
            <DashboardView
              onSelectGoal={handleSelectGoal}
              onGoalUpdate={setGoals}
              onCreateGoal={() => setIsCreatingGoal(true)}
              goals={goals}
              isLoading={isLoading}
              error={null}
              onRetry={fetchGoals}
            />
          ) : (
            selectedGoal && (
              <GoalDetailView
                goal={selectedGoal}
                onBack={handleBackToDashboard}
                onSelectMilestone={handleMilestoneSelect}
                onGoalUpdate={handleGoalUpdate}
                selectedMilestoneId={selectedMilestoneId}
              />
            )
          )}
        </section>

        <aside className="lg:col-span-1 space-y-6">
          <CalendarWidget />
          <QuickActions
            onAddGoal={() => setIsCreatingQuickGoal(true)}
            onAddMilestone={() => handleQuickAction('milestone')}
            onAddTask={() => handleQuickAction('task')}
            onAddTodo={() => handleQuickAction('todo')}
          />
        </aside>

        {/* Модальное окно выбора цели */}
        {isSelectingGoal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold mb-4">Select Goal</h3>
              <div className="space-y-2">
                {goals.map(goal => (
                  <button
                    key={goal.id}
                    onClick={() => handleGoalSelect(goal.id)}
                    className="w-full text-left p-3 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="font-medium text-gray-900">{goal.title}</div>
                    <div className="text-sm text-gray-600">{goal.description}</div>
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

        {/* Модальное окно выбора milestone */}
        {isSelectingMilestone && selectedGoalId && selectedGoal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold mb-4">Select Milestone</h3>
              <div className="space-y-2">
                {selectedGoal.milestones && selectedGoal.milestones.length > 0 ? (
                  selectedGoal.milestones.map(milestone => (
                    <button
                      key={milestone.id}
                      onClick={() => handleMilestoneSelect(milestone.id)}
                      className="w-full text-left p-3 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="font-medium text-gray-900">{milestone.title}</div>
                      <div className="text-sm text-gray-600">{milestone.description}</div>
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

        {/* Модальное окно выбора task */}
        {isSelectingTask && selectedMilestoneId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold mb-4">Select Task</h3>
              <div className="space-y-2">
                {selectedGoal?.milestones
                  .find(m => m.id === selectedMilestoneId)
                  ?.tasks.map(task => (
                    <button
                      key={task.id}
                      onClick={() => handleTaskSelect(task.id)}
                      className="w-full text-left p-3 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="font-medium text-gray-900">{task.title}</div>
                      <div className="text-sm text-gray-600">{task.description}</div>
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

        {/* Модальные окна для создания элементов */}
        {isCreatingGoal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">Create New Goal</h3>
              <GoalForm
                onSuccess={handleCreateGoal}
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

        {isCreatingTodo && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">
                {pendingAction === 'subtask' ? 'Create New Subtask' : 'Create New Todo'}
              </h3>
              {pendingAction === 'subtask' ? (
                <SubtaskForm
                  taskId={selectedTaskId || ''}
                  onSuccess={handleCreateSubtask}
                  onCancel={() => {
                    setIsCreatingTodo(false);
                    setSelectedTaskId(null);
                    setSelectedMilestoneId(null);
                    setPendingAction(null);
                  }}
                />
              ) : (
                <TodoForm
                  taskId={selectedTaskId || ''}
                  onSuccess={handleCreateTodo}
                  onCancel={() => {
                    setIsCreatingTodo(false);
                    setSelectedTaskId(null);
                    setSelectedMilestoneId(null);
                    setPendingAction(null);
                  }}
                />
              )}
            </div>
          </div>
        )}

        {/* Модальное окно для быстрого создания цели */}
        {isCreatingQuickGoal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">Quick Create Goal</h3>
              <GoalForm
                onSuccess={handleCreateGoal}
                onCancel={() => setIsCreatingQuickGoal(false)}
              />
            </div>
          </div>
        )}

        {showTaskForm && selectedGoal && selectedMilestone && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">Add Task</h3>
              <TaskForm
                goalId={selectedGoal.id}
                milestoneId={selectedMilestone.id}
                onSuccess={handleCreateTask}
                onCancel={() => {
                  setShowTaskForm(false);
                  setSelectedMilestone(null);
                }}
              />
            </div>
          </div>
        )}

        {showTodoForm && selectedTask && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">Add Todo</h3>
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
              <h3 className="text-lg font-semibold mb-4">Add Subtask</h3>
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
      </main>
    </div>
  );
};

export default withAuth(Home);
