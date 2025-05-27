import React, { useState, useEffect } from 'react';
import { MilestoneItem as Milestone, StatusType, PriorityType, TaskItem as Task, TodoItem as Todo } from '@/lib/types';
import { callGeminiAPI } from '@/lib/geminiApi';
import { tasksApi, todosApi, subtasksApi, milestonesApi } from '@/lib/api';

interface GeneratedTasks {
  dailyTasks: string[];
  oneTimeTodos: string[];
}

interface MilestoneCardProps {
  milestone: Milestone;
  onSelectMilestone: (milestoneId: string) => void;
  onAddTask: () => void;
  onMilestoneUpdate: (updatedMilestone: Milestone) => void;
}

export const MilestoneCard: React.FC<MilestoneCardProps> = ({
  milestone,
  onSelectMilestone,
  onAddTask,
  onMilestoneUpdate,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [generatedTasks, setGeneratedTasks] = useState<GeneratedTasks | null>(null);
  const [isGeneratingTasks, setIsGeneratingTasks] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentMilestone, setCurrentMilestone] = useState<Milestone>(milestone);
  
  // Initialize tasks and todos with empty arrays if undefined
  const tasks = currentMilestone.tasks || [];
  const todos = currentMilestone.todos || [];
  
  // Calculate progress based on completed tasks
  const totalTasks = tasks.length + todos.length;
  const completedTasks = tasks.filter(t => t.status === StatusType.FINISHED).length +
    todos.filter(t => t.status === StatusType.FINISHED).length;
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  // Добавляем useEffect для синхронизации состояния
  useEffect(() => {
    setCurrentMilestone(milestone);
  }, [milestone]);

  const handleExpand = async () => {
    if (!isExpanded) {
      setIsLoading(true);
      try {

        const fullMilestone = await milestonesApi.getById(milestone.id, true, true, true);
        setCurrentMilestone(fullMilestone);
        onMilestoneUpdate(fullMilestone);
      } catch (error) {
        console.error('Failed to load milestone details:', error);
      } finally {
        setIsLoading(false);
      }
    }
    setIsExpanded(!isExpanded);
  };

  const handleSuggestTasks = async () => {
    setIsGeneratingTasks(true);
    setGeneratedTasks(null);

    const prompt = `Generate a list of daily tasks and one-time todos for a milestone named "${milestone.title}". Provide the output as a JSON object with two arrays: "dailyTasks" and "oneTimeTodos".`;
    const schema = {
      type: "OBJECT",
      properties: {
        dailyTasks: {
          type: "ARRAY",
          items: { type: "STRING" }
        },
        oneTimeTodos: {
          type: "ARRAY",
          items: { type: "STRING" }
        }
      },
      propertyOrdering: ["dailyTasks", "oneTimeTodos"]
    };

    const result = await callGeminiAPI<GeneratedTasks>(prompt, schema);
    if (result) {
      setGeneratedTasks(result);
    }
    setIsGeneratingTasks(false);
  };

  const handleTaskToggle = async (itemId: string, type: 'task' | 'subtask' | 'todo', currentStatus: boolean) => {
    setIsUpdating(true);
    try {
      const parentTask = milestone.tasks.find(t => 
        t.id === itemId || 
        t.subtasks.some(st => st.id === itemId) || 
        t.todos.some(td => td.id === itemId)
      );

      if (!parentTask) return;

      // Определяем новый статус на основе текущего
      const newStatus = currentStatus ? StatusType.OUTSTANDING : StatusType.FINISHED;

      switch (type) {
        case 'task':
          await tasksApi.update({ 
            id: itemId, 
            status: newStatus,
            ...(newStatus === StatusType.FINISHED && { end_datetime: new Date().toISOString() })
          });
          break;
        case 'subtask':
          await subtasksApi.update({ 
            id: itemId, 
            status: newStatus,
            ...(newStatus === StatusType.FINISHED && { end_datetime: new Date().toISOString() })
          });
          break;
        case 'todo':
          await todosApi.update({ 
            id: itemId, 
            status: newStatus,
            ...(newStatus === StatusType.FINISHED && { end_datetime: new Date().toISOString() })
          });
          break;
      }

      const updatedTask = await tasksApi.get(parentTask.id, true, true);
      
      const updatedMilestone = {
        ...milestone,
        tasks: milestone.tasks.map(t => t.id === parentTask.id ? updatedTask : t)
      };
      onMilestoneUpdate(updatedMilestone);
    } catch (error) {
      console.error('Failed to update task status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div
        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors duration-200"
        onClick={handleExpand}
      >
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h4 className="text-lg font-medium mb-1">{milestone.title}</h4>
            <p className="text-gray-600 text-sm mb-2">{milestone.description}</p>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <span>Due: {new Date(milestone.due_date || '').toLocaleDateString()}</span>
              <span>•</span>
              <span className="capitalize">{milestone.status.toLowerCase()}</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddTask();
              }}
              className="p-2 text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                ></path>
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSelectMilestone(milestone.id);
              }}
              className="p-2 text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                ></path>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                ></path>
              </svg>
            </button>
          </div>
        </div>

        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-gray-600">Progress</span>
            <span className="text-sm font-medium text-gray-800">{Math.round(progress)}%</span>
          </div>
          <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gray-800 h-full rounded-full transition-all duration-300 ease-in-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-gray-100 p-4">
          {isLoading ? (
            <div className="flex justify-center items-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-800"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {tasks.map((task) => (
                <div key={task.id} className="bg-gray-50 rounded-lg p-3">
                  {/* Task Header */}
                  <div className="flex items-center space-x-3 mb-2">
                    <input
                      type="checkbox"
                      checked={task.status === StatusType.FINISHED}
                      onChange={() => handleTaskToggle(task.id, 'task', task.status === StatusType.FINISHED)}
                      disabled={isUpdating}
                      className="h-4 w-4 rounded border-gray-300 cursor-pointer accent-gray-900"
                    />
                    <span className={`flex-1 font-medium ${task.status === StatusType.FINISHED ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                      {task.title}
                    </span>
                    {task.due_date && (
                      <span className="text-sm text-gray-500">
                        {new Date(task.due_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  {/* Subtasks */}
                  {task.subtasks.length > 0 && (
                    <div className="ml-6 mb-2 space-y-1 border-l-2 border-gray-200 pl-3">
                      {task.subtasks.map((subtask) => (
                        <div key={subtask.id} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={subtask.status === StatusType.FINISHED}
                            onChange={() => handleTaskToggle(subtask.id, 'subtask', subtask.status === StatusType.FINISHED)}
                            disabled={isUpdating}
                            className="h-3 w-3 rounded border-gray-300 cursor-pointer accent-gray-900"
                          />
                          <span className={`text-sm ${subtask.status === StatusType.FINISHED ? 'line-through text-gray-500' : 'text-gray-700'}`}>
                            {subtask.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Todos */}
                  {task.todos.length > 0 && (
                    <div className="ml-6 space-y-1 border-l-2 border-gray-200 pl-3">
                      {task.todos.map((todo) => (
                        <div key={todo.id} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={todo.status === StatusType.FINISHED}
                            onChange={() => handleTaskToggle(todo.id, 'todo', todo.status === StatusType.FINISHED)}
                            disabled={isUpdating}
                            className="h-3 w-3 rounded border-gray-300 cursor-pointer accent-gray-900"
                          />
                          <span className={`text-sm ${todo.status === StatusType.FINISHED ? 'line-through text-gray-500' : 'text-gray-700'}`}>
                            {todo.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {totalTasks === 0 && (
                <p className="text-gray-500 text-sm text-center py-2">
                  No tasks or todos yet. Add some to get started!
                </p>
              )}
            </div>
          )}

          <button
            className="px-4 py-2 rounded-xl font-medium cursor-pointer transition-colors duration-200 bg-gray-800 text-white hover:bg-gray-900 mt-4 flex items-center justify-center"
            onClick={handleSuggestTasks}
            disabled={isGeneratingTasks}
          >
            {isGeneratingTasks ? (
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              '✨ Suggest Tasks'
            )}
          </button>

          {generatedTasks && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
              <h6 className="font-semibold mb-2 text-gray-700">Suggested Tasks:</h6>
              {generatedTasks.dailyTasks.length > 0 && (
                <>
                  <p className="text-sm font-medium text-gray-600 mb-1">Daily Tasks:</p>
                  <ul className="list-disc list-inside text-sm text-gray-800 mb-2">
                    {generatedTasks.dailyTasks.map((task, index) => (
                      <li key={`gen-daily-${index}`}>{task}</li>
                    ))}
                  </ul>
                </>
              )}
              {generatedTasks.oneTimeTodos.length > 0 && (
                <>
                  <p className="text-sm font-medium text-gray-600 mb-1">One-time Todos:</p>
                  <ul className="list-disc list-inside text-sm text-gray-800">
                    {generatedTasks.oneTimeTodos.map((todo, index) => (
                      <li key={`gen-todo-${index}`}>{todo}</li>
                    ))}
                  </ul>
                </>
              )}
              {generatedTasks.dailyTasks.length === 0 && generatedTasks.oneTimeTodos.length === 0 && (
                <p className="text-sm text-gray-500">No suggestions generated.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}; 