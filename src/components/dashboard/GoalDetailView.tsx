import React, { useState, useEffect } from 'react';
import {  GoalItem as Goal, MilestoneItem as Milestone, StatusType, PriorityType, TaskItem as Task, TodoItem as Todo, Event } from '@/lib/types';
import { MilestoneCard } from './MilestoneCard';
import { MilestoneForm } from './MilestoneForm';
import { TaskForm } from './TaskForm';
import { milestonesApi, tasksApi, todosApi, eventsApi } from '@/lib/api';

interface GoalDetailViewProps {
  goal: Goal;
  onBack: () => void;
  onSelectMilestone: (milestoneId: string) => void;
  onGoalUpdate: (updatedGoal: Goal) => void;
  selectedMilestoneId: string | null;
}

export const GoalDetailView: React.FC<GoalDetailViewProps> = ({
  goal,
  onBack,
  onSelectMilestone,
  onGoalUpdate,
  selectedMilestoneId: initialMilestoneId,
}) => {
  const [isCreatingMilestone, setIsCreatingMilestone] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(initialMilestoneId);
  const [isSyncingCalendar, setIsSyncingCalendar] = useState(false);
  const [milestones, setMilestones] = useState<Milestone[]>(goal.milestones || []);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMilestones();
  }, [goal.id, goal.milestones?.length]);

  // Add new useEffect for handling task creation
  useEffect(() => {
    if (selectedMilestoneId) {
      setIsCreatingTask(true);
    }
  }, [selectedMilestoneId]);

  const fetchMilestones = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await milestonesApi.getAll();
      const goalMilestones = data.filter(m => m.goal_id === goal.id);
      setMilestones(goalMilestones);
      // Update goal with fetched milestones
      onGoalUpdate({
        ...goal,
        milestones: goalMilestones,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch milestones');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateMilestone = async (newMilestone: Milestone) => {
    try {
      const createdMilestone = await milestonesApi.create(newMilestone);
      const updatedMilestones = [...milestones, createdMilestone];
      setMilestones(updatedMilestones);
      const updatedGoal = {
        ...goal,
        milestones: updatedMilestones,
      };
      onGoalUpdate(updatedGoal);
      setIsCreatingMilestone(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create milestone');
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
      onGoalUpdate(updatedGoal);
      setIsCreatingTask(false);
      setSelectedMilestoneId(null);
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

  const handleMilestoneUpdate = (updatedMilestone: Milestone) => {
    const updatedMilestones = milestones.map(m => 
      m.id === updatedMilestone.id ? updatedMilestone : m
    );
    setMilestones(updatedMilestones);
    onGoalUpdate({
      ...goal,
      milestones: updatedMilestones,
    });
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
          onClick={fetchMilestones}
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
            onClick={() => setIsCreatingMilestone(true)}
            className="px-4 py-2 rounded-xl font-medium cursor-pointer transition-colors duration-200 bg-gray-800 text-white hover:bg-gray-900"
          >
            Add Milestone
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
          <div>
            <h2 className="text-2xl font-bold mb-2">{goal.title}</h2>
            <p className="text-gray-600">{goal.description}</p>
          </div>
          <div className="flex gap-2">
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
              {goal.status}
            </span>
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
              {goal.priority}
            </span>
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
          <span>Start: {new Date(goal.start_datetime || '').toLocaleDateString()}</span>
          {goal.end_datetime && (
            <span>End: {new Date(goal.end_datetime).toLocaleDateString()}</span>
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
                  milestone={milestone}
                  onSelectMilestone={onSelectMilestone}
                  onAddTask={() => {
                    setSelectedMilestoneId(milestone.id);
                    setIsCreatingTask(true);
                  }}
                  onMilestoneUpdate={handleMilestoneUpdate}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}; 