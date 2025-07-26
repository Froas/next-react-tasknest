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

  const { updateGoal, addTaskToMilestoneInGoal, addMilestoneToGoal, addEvent } = useStore();

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
      
      // Update milestone in the goal using store helper method
      const updatedGoal = {
        ...goal,
        milestones: goal.milestones?.map(m => 
          m.id === milestoneId ? { ...m, ...updatedMilestone } : m
        ) || []
      };
      updateGoal(updatedGoal);
    } catch (error) {
      console.error('Error updating milestone:', error);
      setError('Failed to update milestone');
    }
  };

  const handleMilestoneDelete = async (milestoneId: string) => {
    try {
      await milestonesApi.delete(milestoneId);
      const updatedGoal = {
        ...goal,
        milestones: goal.milestones?.filter(m => m.id !== milestoneId) || []
      };
      updateGoal(updatedGoal);
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
      
      // Create event for the goal itself
      eventsToCreate.push({
        title: `Goal: ${goal.title}`,
        description: `Goal deadline: ${goal.description || 'No description'}`,
        start_datetime: goal.end_datetime || new Date().toISOString(),
        end_datetime: goal.end_datetime || new Date().toISOString(),
        status: goal.status,
        goal_id: goal.id,
        location: 'Goal Planning',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      // Create events for each milestone
      if (goal.milestones && goal.milestones.length > 0) {
        goal.milestones.forEach(milestone => {
          eventsToCreate.push({
            title: `Milestone: ${milestone.title}`,
            description: `${milestone.description || 'No description'}\nGoal: ${goal.title}`,
            start_datetime: milestone.due_date || milestone.end_datetime || new Date().toISOString(),
            end_datetime: milestone.due_date || milestone.end_datetime || new Date().toISOString(),
            status: milestone.status,
            goal_id: goal.id,
            location: 'Milestone Review',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

          // Create events for important tasks with due dates
          if (milestone.tasks && milestone.tasks.length > 0) {
            milestone.tasks
              .filter(task => task.due_date && task.priority === 'high')
              .forEach(task => {
                eventsToCreate.push({
                  title: `Task: ${task.title}`,
                  description: `${task.description || 'No description'}\nMilestone: ${milestone.title}\nGoal: ${goal.title}`,
                  start_datetime: task.due_date!,
                  end_datetime: task.due_date!,
                  status: task.status,
                  goal_id: goal.id,
                  location: 'Task Work',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                });
              });
          }
        });
      }

      // Create all events
      const createdEvents = await Promise.all(
        eventsToCreate.map(eventData => eventsApi.create(eventData))
      );

      // Update the events store with new events
      createdEvents.forEach(event => addEvent(event));

      // Show success message
      setError(null);
      const goalEvents = 1;
      const milestoneEvents = goal.milestones?.length || 0;
      const taskEvents = createdEvents.length - goalEvents - milestoneEvents;
      
      alert(`Successfully synced ${createdEvents.length} items to calendar:\n` +
            `• ${goalEvents} Goal event\n` +
            `• ${milestoneEvents} Milestone events\n` +
            `• ${taskEvents} High-priority task events\n\n` +
            `Check the calendar widget to see your scheduled items!`);
      
      console.log('Created calendar events:', createdEvents);
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
      {/* Error notification */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-red-600 hover:text-red-800 ml-4"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <button
          className="px-2 py-1.5 text-sm rounded-md font-medium cursor-pointer transition-colors duration-200 bg-gray-100 text-gray-700 hover:bg-gray-200 flex items-center"
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
            className="px-3 py-1.5 text-sm rounded-md font-medium cursor-pointer transition-colors duration-200 bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 flex items-center space-x-1"
            title="Sync goal, milestones, and high-priority tasks to calendar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>{isSyncingCalendar ? 'Syncing...' : 'Sync Calendar'}</span>
          </button>
          <button
            onClick={handleAddMilestone}
            className="px-2 py-1.5 text-sm rounded-md font-medium cursor-pointer transition-colors duration-200 bg-blue-600 text-white hover:bg-blue-700"
          >
            + Milestone
          </button>
          <button
            onClick={() => setShowDeleteGoalConfirm(true)}
            className="px-2 py-1.5 text-sm rounded-md font-medium cursor-pointer transition-colors duration-200 bg-red-500 text-white hover:bg-red-600"
          >
            Delete
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
