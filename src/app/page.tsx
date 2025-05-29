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

const Home = () => {
  const router = useRouter();
  const [currentView, setCurrentView] = useState<'dashboard' | 'goal-detail' | 'form' | 'visualization'>('dashboard');
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
    setSelectedGoalId(null);
    setIsEditMode(false);
    setIsFormOpen(true);
    setCurrentView('form');
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
      if (isEditMode && selectedGoalId) {
        const updatedGoal = await goalsApi.update({
          id: selectedGoalId,
          ...goalData
        });
        updateGoal(updatedGoal);
      } else {
        const { id, milestones, ...createData } = goalData;
        if (!createData.title || !createData.description || !createData.user_id) {
          throw new Error('Missing required fields');
        }
        const newGoal = await goalsApi.create({
          title: createData.title,
          description: createData.description,
          user_id: createData.user_id,
          status: createData.status || StatusType.OUTSTANDING,
          priority: createData.priority || PriorityType.MEDIUM,
          start_datetime: createData.start_datetime,
          end_datetime: createData.end_datetime
        });
        addGoal(newGoal);
      }
      handleFormClose();
    } catch (error) {
      console.error('Error saving goal:', error);
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

  const selectedGoal = selectedGoalId ? goals.find((goal) => goal.id === selectedGoalId) : null;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 font-sans text-gray-900">
      <Header/>

      <main className="flex-grow container mx-auto p-6 md:p-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2">
          {currentView === 'dashboard' ? (
            <DashboardView
              onSelectGoal={handleGoalClick}
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
          />
        </aside>

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
