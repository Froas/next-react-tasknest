'use client';

import React, { useState, useEffect } from 'react';
import {  GoalItem as Goal, MilestoneItem as Milestone, StatusType, PriorityType, TaskItem as Task, TodoItem as Todo, Event } from '@/lib/types';
import MilestoneCard from './MilestoneCard';
import { MilestoneForm } from './MilestoneForm';
import { TaskForm } from './TaskForm';
import { milestonesApi, tasksApi, todosApi, eventsApi, goalsApi } from '@/lib/api';
import { InlineEdit } from './InlineEdit';
import { InlineSelect } from './InlineSelect';
import { InlineDate } from './InlineDate';
import { useStore } from '@/store/useStore';
import { formatDate } from '@/lib/utils';
// Import the new store action
// import { addTaskToMilestoneInGoal } from '@/store/useStore'; // Actions are part of useStore hook
import GoalHeaderCard from './GoalHeaderCard';
import MilestonesTimeline from './MilestonesTimeline';

interface GoalDetailViewProps {
  goal: Goal;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onViewChange: (view: 'dashboard' | 'goal-detail' | 'form' | 'visualization') => void;
  onSelectMilestone?: (milestoneId: string) => void;
  selectedMilestoneId?: string | null;
}

export const GoalDetailView: React.FC<GoalDetailViewProps> = ({
  goal,
  onBack,
  onEdit,
  onDelete,
  onViewChange,
  onSelectMilestone,
  selectedMilestoneId: initialMilestoneId,
}) => {
  const [isCreatingMilestone, setIsCreatingMilestone] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(initialMilestoneId ?? null);
  const [isSyncingCalendar, setIsSyncingCalendar] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shouldRefresh, setShouldRefresh] = useState(false);

  // States for inline editing
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');

  const [showDeleteGoalConfirm, setShowDeleteGoalConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { updateGoal, addTaskToMilestoneInGoal } = useStore();

  useEffect(() => {
    const loadGoalDetails = async () => {
      try {
        setIsLoading(true);
        const fullGoal = await goalsApi.getById(goal.id, {
          include_milestones: true,
          include_tasks: true,
          include_subtasks: true,
          include_todos: true
        });
        updateGoal(fullGoal);
      } catch (err) {
        console.error('Error loading goal details:', err);
        setError(err instanceof Error ? err.message : 'Failed to load goal details');
      } finally {
        setIsLoading(false);
      }
    };

    loadGoalDetails();
  }, [goal.id, updateGoal]);

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
      
      const updatedGoal = {
        ...goal,
        milestones: [...(goal.milestones || []), newMilestone]
      };
      updateGoal(updatedGoal);
      setIsCreatingMilestone(false);
    } catch (error) {
      console.error('Error creating milestone:', error);
      setError('Failed to create milestone');
    }
  };

  const handleMilestoneUpdate = async (milestoneId: string, data: Partial<Milestone>) => {
    try {
      const updatedMilestone = await milestonesApi.update({
        id: milestoneId,
        ...data
      });
      
      const updatedGoal = {
        ...goal,
        milestones: goal.milestones.map(m => 
          m.id === milestoneId ? { ...m, ...updatedMilestone } : m
        )
      };
      updateGoal(updatedGoal);
    } catch (error) {
      console.error('Error updating milestone:', error);
    }
  };

  const handleMilestoneDelete = async (milestoneId: string) => {
    try {
      await milestonesApi.delete(milestoneId);
      const updatedGoal = {
        ...goal,
        milestones: goal.milestones.filter(m => m.id !== milestoneId)
      };
      updateGoal(updatedGoal);
    } catch (error) {
      console.error('Error deleting milestone:', error);
    }
  };

  const handleSyncCalendar = async () => {
    setIsSyncingCalendar(true);
    setError(null);
    try {
      // Create events for milestones
      const events = await Promise.all(
        goal.milestones.map(milestone =>
          eventsApi.create({
            title: milestone.title,
            description: milestone.description,
            start_datetime: milestone.due_date || new Date().toISOString(),
            end_datetime: milestone.due_date || new Date().toISOString(),
            status: milestone.status,
            goal_id: goal.id,
            milestone_id: milestone.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
        )
      );
      console.log('Created events:', events);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync with calendar');
    } finally {
      setIsSyncingCalendar(false);
    }
  };

  const handleGoalUpdate = async (field: string, value: string) => {
    try {
      const updatedGoal = await goalsApi.update({
        id: goal.id,
        [field]: value,
      });
      onEdit();
      setEditingField(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update goal');
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


  // Calculate progress based on completed milestones
  const totalMilestones = goal.milestones?.length || 0;
  const completedMilestones = goal.milestones?.filter(m => m.status === StatusType.FINISHED).length || 0;
  const progress = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0;

  // Group milestones by status
  const groupedMilestones = (goal.milestones || []).reduce((acc, milestone) => {
    const status = milestone.status;
    if (!acc[status]) {
      acc[status] = [];
    }
    acc[status].push(milestone);
    return acc;
  }, {} as Record<StatusType, Milestone[]>);

  const handleAddMilestone = () => {
    setIsCreatingMilestone(true);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-800 p-4 rounded-lg">
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
                
                // Обновляем goal в store с полными данными
                updateGoal(fullGoal);
              } catch (error) {
                console.error('Error loading goal details:', error);
                setError('Failed to load goal details');
              }
            };
            loadGoalDetails();
          }}
          className="mt-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div data-testid="goal-detail-view">
      <div className="flex justify-between items-center mb-6">
        <button
          className="px-4 py-2 rounded-xl font-medium cursor-pointer transition-colors duration-200 bg-gray-200 text-gray-800 hover:bg-gray-300 flex items-center"
          onClick={onBack}
        >
          <svg
            className="w-6 h-6 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
          </svg>
          Back to Dashboard
        </button>
        <div className="flex space-x-3">
          <button
            onClick={handleSyncCalendar}
            disabled={isSyncingCalendar}
            className="px-4 py-2 rounded-xl font-medium cursor-pointer transition-colors duration-200 bg-gray-200 text-gray-800 hover:bg-gray-300 disabled:opacity-50"
          >
            {isSyncingCalendar ? 'Syncing...' : 'Sync with Calendar'}
          </button>
          <button
            onClick={handleAddMilestone}
            className="px-4 py-2 rounded-xl font-medium cursor-pointer transition-colors duration-200 bg-gray-800 text-white hover:bg-gray-900"
          >
            Add Milestone
          </button>
          <button
            onClick={() => setShowDeleteGoalConfirm(true)}
            className="px-4 py-2 rounded-xl font-medium cursor-pointer transition-colors duration-200 bg-red-600 text-white hover:bg-red-700"
          >
            Delete Goal
          </button>
        </div>
      </div>

      {isCreatingMilestone && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Create New Milestone</h3>
            <MilestoneForm
              goalId={goal.id}
              onSuccess={handleCreateMilestone}
              onCancel={() => setIsCreatingMilestone(false)}
            />
          </div>
        </div>
      )}

      {isCreatingTask && selectedMilestoneId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Add Task</h3>
            <TaskForm
              goalId={goal.id}
              milestoneId={selectedMilestoneId}
              onSuccess={handleCreateTask}
              onCancel={() => {
                setIsCreatingTask(false);
                setSelectedMilestoneId(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Goal header */}
      <GoalHeaderCard goal={goal} progress={progress} />

      {/* Milestones timeline */}
      <MilestonesTimeline
        milestones={goal.milestones || []}
        goalId={goal.id}
        onUpdate={handleMilestoneUpdate}
        onDelete={handleMilestoneDelete}
        onAddTask={(milestoneId) => {
          setSelectedMilestoneId(milestoneId);
          setIsCreatingTask(true);
        }}
      />

      {/* Delete Goal Confirmation Dialog */}
      {showDeleteGoalConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Delete Goal</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this goal? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteGoalConfirm(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setIsDeleting(true);
                  try {
                    await onDelete();
                    setShowDeleteGoalConfirm(false);
                    onBack();
                  } catch (error) {
                    console.error('Failed to delete goal:', error);
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
