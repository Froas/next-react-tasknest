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
  const [milestones, setMilestones] = useState<Milestone[]>(goal.milestones || []);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // States for inline editing
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');

  const [showDeleteGoalConfirm, setShowDeleteGoalConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { 
    milestones: storeMilestones,
    isLoadingMilestones,
    milestonesError,
    fetchMilestones,
    addMilestone,
    updateMilestone,
    deleteMilestone,
    updateGoal
  } = useStore();

  useEffect(() => {
    const loadGoalDetails = async () => {
      try {
        setIsLoading(true);
        console.log('Loading goal details for goal:', goal.id);
        const fullGoal = await goalsApi.getById(goal.id, {
          include_milestones: true,
          include_tasks: true,
          include_subtasks: true,
          include_todos: true
        });
        console.log('Received full goal data:', fullGoal);
        console.log('Milestones in full goal:', fullGoal.milestones);
        
        // Обновляем goal в store с полными данными
        updateGoal(fullGoal);
        // Обновляем локальное состояние milestones
        setMilestones(fullGoal.milestones || []);
        console.log('Updated local milestones state:', fullGoal.milestones || []);
      } catch (error) {
        console.error('Error loading goal details:', error);
        setError('Failed to load goal details');
      } finally {
        setIsLoading(false);
      }
    };
    loadGoalDetails();
  }, [goal.id, updateGoal]);

  // Add effect to log milestone state changes
  useEffect(() => {
    console.log('Current milestones state:', milestones);
  }, [milestones]);

  // Add effect to log goal changes
  useEffect(() => {
    console.log('Current goal data:', goal);
    console.log('Goal milestones:', goal.milestones);
  }, [goal]);

  // Add new useEffect for handling task creation
  useEffect(() => {
    if (selectedMilestoneId) {
      setIsCreatingTask(true);
    }
  }, [selectedMilestoneId]);

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
        position: storeMilestones.length
      });
      
      // Update store after successful API call
      addMilestone(newMilestone);
      setIsCreatingMilestone(false);
      
      // Refresh goal data to get updated milestones
      const fullGoal = await goalsApi.getById(goal.id, {
        include_milestones: true,
        include_tasks: true,
        include_subtasks: true,
        include_todos: true
      });
      updateGoal(fullGoal);
      setMilestones(fullGoal.milestones || []);
    } catch (error) {
      console.error('Error creating milestone:', error);
      setError('Failed to create milestone');
    }
  };

  const handleCreateTask = async (newTask: Task | Todo) => {
    try {
      const milestoneIndex = milestones.findIndex(m => m.id === selectedMilestoneId);
      if (milestoneIndex === -1) return;

      const updatedMilestone = {
        ...milestones[milestoneIndex],
        tasks: milestones[milestoneIndex].tasks || []
      };

      if ('milestone_id' in newTask) {
        updatedMilestone.tasks = [...updatedMilestone.tasks, newTask as Task];
      }

      const updatedMilestones = [...milestones];
      updatedMilestones[milestoneIndex] = updatedMilestone;
      setMilestones(updatedMilestones);

      const updatedGoal = {
        ...goal,
        milestones: updatedMilestones,
      };
      onEdit();
      setIsCreatingTask(false);
      setSelectedMilestoneId(null);
      
      // Refresh goal data to get updated tasks
      const fullGoal = await goalsApi.getById(goal.id, {
        include_milestones: true,
        include_tasks: true,
        include_subtasks: true,
        include_todos: true
      });
      updateGoal(fullGoal);
      setMilestones(fullGoal.milestones || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task');
    }
  };

  const handleSyncCalendar = async () => {
    setIsSyncingCalendar(true);
    setError(null);
    try {
      // Create events for milestones
      const events = await Promise.all(
        milestones.map(milestone =>
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

  const handleMilestoneUpdate = async (milestoneId: string, data: Partial<Milestone>) => {
    try {
      const updatedMilestone = await milestonesApi.update({
        id: milestoneId,
        ...data
      });
      updateMilestone(updatedMilestone);
      
      // Refresh goal data to get updated milestone
      const fullGoal = await goalsApi.getById(goal.id, {
        include_milestones: true,
        include_tasks: true,
        include_subtasks: true,
        include_todos: true
      });
      updateGoal(fullGoal);
      setMilestones(fullGoal.milestones || []);
    } catch (error) {
      console.error('Error updating milestone:', error);
    }
  };

  const handleMilestoneDelete = async (milestoneId: string) => {
    try {
      await milestonesApi.delete(milestoneId);
      deleteMilestone(milestoneId);
      
      // Refresh goal data after deletion
      const fullGoal = await goalsApi.getById(goal.id, {
        include_milestones: true,
        include_tasks: true,
        include_subtasks: true,
        include_todos: true
      });
      updateGoal(fullGoal);
      setMilestones(fullGoal.milestones || []);
    } catch (error) {
      console.error('Error deleting milestone:', error);
    }
  };

  // Calculate progress based on completed milestones
  const totalMilestones = milestones.length;
  const completedMilestones = milestones.filter(m => m.status === StatusType.FINISHED).length;
  const progress = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0;

  // Group milestones by status
  const groupedMilestones = milestones.reduce((acc, milestone) => {
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
                setIsLoading(true);
                const fullGoal = await goalsApi.getById(goal.id, {
                  include_milestones: true,
                  include_tasks: true,
                  include_subtasks: true,
                  include_todos: true
                });
                
                // Обновляем goal в store с полными данными
                updateGoal(fullGoal);
                // Обновляем локальное состояние milestones
                setMilestones(fullGoal.milestones || []);
              } catch (error) {
                console.error('Error loading goal details:', error);
                setError('Failed to load goal details');
              } finally {
                setIsLoading(false);
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

      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-grow">
            {editingField === 'title' ? (
              <InlineEdit
                value={goal.title}
                onSave={(value) => handleGoalUpdate('title', value)}
                onCancel={() => setEditingField(null)}
                className="text-2xl font-bold"
              />
            ) : (
              <h2 
                className="text-2xl font-bold mb-2 cursor-pointer hover:bg-gray-50 rounded px-2 py-1"
                onClick={() => setEditingField('title')}
              >
                {goal.title}
              </h2>
            )}
            {editingField === 'description' ? (
              <InlineEdit
                value={goal.description}
                onSave={(value) => handleGoalUpdate('description', value)}
                onCancel={() => setEditingField(null)}
                type="textarea"
                className="text-gray-600"
              />
            ) : (
              <p 
                className="text-gray-600 cursor-pointer hover:bg-gray-50 rounded px-2 py-1"
                onClick={() => setEditingField('description')}
              >
                {goal.description}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {editingField === 'status' ? (
              <InlineSelect
                value={goal.status}
                options={Object.values(StatusType).map(status => ({
                  value: status,
                  label: status.replace('_', ' '),
                }))}
                onSave={(value) => handleGoalUpdate('status', value)}
                onCancel={() => setEditingField(null)}
                className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800"
              />
            ) : (
              <span 
                className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 cursor-pointer hover:bg-gray-200"
                onClick={() => setEditingField('status')}
              >
                {goal.status}
              </span>
            )}
            {editingField === 'priority' ? (
              <InlineSelect
                value={goal.priority}
                options={Object.values(PriorityType).map(priority => ({
                  value: priority,
                  label: priority,
                }))}
                onSave={(value) => handleGoalUpdate('priority', value)}
                onCancel={() => setEditingField(null)}
                className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800"
              />
            ) : (
              <span 
                className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 cursor-pointer hover:bg-gray-200"
                onClick={() => setEditingField('priority')}
              >
                {goal.priority}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-700">Overall Progress:</span>
          <span className="font-semibold text-gray-800">{Math.round(progress)}%</span>
        </div>
        <div className="bg-gray-200 rounded-full h-2.5 overflow-hidden mb-6">
          <div
            className="bg-gray-800 h-full rounded-full transition-all duration-300 ease-in-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>

        <div className="flex justify-between text-sm text-gray-500 mb-8">
          {editingField === 'start_datetime' ? (
            <InlineDate
              value={goal.start_datetime ? new Date(goal.start_datetime).toISOString().split('T')[0] : ''}
              onSave={(value) => handleGoalUpdate('start_datetime', value)}
              onCancel={() => setEditingField(null)}
              className="text-gray-500"
            />
          ) : (
            <span 
              className="cursor-pointer hover:bg-gray-50 rounded px-2 py-1"
              onClick={() => setEditingField('start_datetime')}
            >
              Start: {goal.start_datetime ? new Date(goal.start_datetime).toLocaleDateString() : 'Not set'}
            </span>
          )}
          {editingField === 'end_datetime' ? (
            <InlineDate
              value={goal.end_datetime ? new Date(goal.end_datetime).toISOString().split('T')[0] : ''}
              onSave={(value) => handleGoalUpdate('end_datetime', value)}
              onCancel={() => setEditingField(null)}
              className="text-gray-500"
            />
          ) : (
            <span 
              className="cursor-pointer hover:bg-gray-50 rounded px-2 py-1"
              onClick={() => setEditingField('end_datetime')}
            >
              End: {goal.end_datetime ? new Date(goal.end_datetime).toLocaleDateString() : 'Not set'}
            </span>
          )}
        </div>

        <div className="space-y-6">
          {Object.entries(groupedMilestones).map(([status, milestones]) => (
            <div key={status}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold capitalize">{status.toLowerCase()} Milestones</h3>
                {milestones.length > 0 && (
                  <button
                    data-testid="add-task-button"
                    onClick={() => {
                      setSelectedMilestoneId(milestones[0].id);
                      setIsCreatingTask(true);
                    }}
                    className="text-sm text-gray-600 hover:text-gray-800"
                  >
                    + Add Task
                  </button>
                )}
              </div>
              {milestones.map((milestone) => (
                <MilestoneCard
                  key={milestone.id}
                  goalId={goal.id}
                  milestone={milestone}
                  onUpdate={(data) => handleMilestoneUpdate(milestone.id, data)}
                  onDelete={() => handleMilestoneDelete(milestone.id)}
                  onSelectMilestone={onSelectMilestone}
                  onAddTask={() => {
                    setSelectedMilestoneId(milestone.id);
                    setIsCreatingTask(true);
                  }}
                  onMilestoneUpdate={(data) => handleMilestoneUpdate(milestone.id, data)}
                  onMilestoneDelete={() => handleMilestoneDelete(milestone.id)}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

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
                onClick={() => {
                  setIsDeleting(true);
                  onDelete();
                  onBack();
                  setShowDeleteGoalConfirm(false);
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