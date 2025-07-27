'use client';

import React, { useState, useEffect } from 'react';
import { withAuth } from '@/hoc/withAuth';
import { TodoItem, TaskItem, SubtaskItem, StatusType, PriorityType } from '@/lib/types';
import { useStore } from '@/store/useStore';
import { goalsApi } from '@/lib/api';
import { CheckSquare, List, Target, Plus, Check, Calendar } from 'lucide-react';

type ItemType = 'task' | 'todo' | 'subtask';
type ViewFilter = 'all' | 'todos' | 'subtasks';

interface KanbanItem {
  id: string;
  title: string;
  description?: string;
  status: StatusType;
  priority: PriorityType;
  due_date?: string;
  type: ItemType;
  taskTitle?: string;
  goalTitle?: string;
  milestoneTitle?: string;
}

const TodosPage: React.FC = () => {
  const [viewFilter, setViewFilter] = useState<ViewFilter>('all');

  const { 
    goals,
    tasks,
    todos,
    isLoadingGoals,
    isLoadingTasks,
    isLoadingTodos,
    fetchGoals,
    fetchTasks,
    fetchTodos,
    setGoals
  } = useStore();

  useEffect(() => {
    const loadFullData = async () => {
      try {
        // Load goals with full nested data (like in GoalDetailView)
        const goalsWithFullData = await Promise.all(
          (await goalsApi.getAll()).map(async (goal) => {
            try {
              return await goalsApi.getById(goal.id, {
                include_milestones: true,
                include_tasks: true,
                include_subtasks: true,
                include_todos: true
              });
            } catch (error) {
              console.error(`Failed to fetch full data for goal ${goal.id}:`, error);
              return goal;
            }
          })
        );
        
        // Update the goals in the store with full data
        setGoals(goalsWithFullData);
        
        // Also fetch standalone tasks and todos
        fetchTasks();
        fetchTodos();
      } catch (error) {
        console.error('Failed to load full goal data:', error);
        // Fallback to regular fetch methods
        fetchGoals();
        fetchTasks();
        fetchTodos();
      }
    };

    loadFullData();
  }, [fetchGoals, fetchTasks, fetchTodos, setGoals]);

  // Status columns configuration
  const statusColumns = [
    { 
      status: StatusType.OUTSTANDING, 
      title: 'Outstanding', 
      bgColor: 'bg-slate-100',
      cardColor: 'bg-slate-50 border-slate-200',
      gradient: 'from-slate-50 to-slate-100'
    },
    { 
      status: StatusType.STARTED, 
      title: 'Started', 
      bgColor: 'bg-amber-100',
      cardColor: 'bg-amber-50 border-amber-200',
      gradient: 'from-amber-50 to-amber-100'
    },
    { 
      status: StatusType.IN_PROGRESS, 
      title: 'In Progress', 
      bgColor: 'bg-blue-100',
      cardColor: 'bg-blue-50 border-blue-200',
      gradient: 'from-blue-50 to-blue-100'
    },
    { 
      status: StatusType.FINISHED, 
      title: 'Finished', 
      bgColor: 'bg-green-100',
      cardColor: 'bg-green-50 border-green-200',
      gradient: 'from-green-50 to-green-100'
    },
    { 
      status: StatusType.CLOSED, 
      title: 'Closed', 
      bgColor: 'bg-gray-100',
      cardColor: 'bg-gray-50 border-gray-200',
      gradient: 'from-gray-50 to-gray-100'
    },
    { 
      status: StatusType.ABORTED, 
      title: 'Aborted', 
      bgColor: 'bg-red-100',
      cardColor: 'bg-red-50 border-red-200',
      gradient: 'from-red-50 to-red-100'
    },
    { 
      status: StatusType.CANCELLED, 
      title: 'Cancelled', 
      bgColor: 'bg-red-100',
      cardColor: 'bg-red-50 border-red-200',
      gradient: 'from-red-50 to-red-100'
    }
  ];

  // Get all items (ONLY subtasks and todos, NO tasks)
  const getAllItems = (): KanbanItem[] => {
    const allItems: KanbanItem[] = [];
    
    // Debug: Log the data structure
    console.log('Goals data:', goals);
    console.log('Tasks data:', tasks);
    console.log('Todos data:', todos);
    
    // Add subtasks and todos from goals structure
    goals.forEach(goal => {
      goal.milestones?.forEach(milestone => {
        milestone.tasks?.forEach(task => {
          console.log('Processing task:', task.title, 'Subtasks:', task.subtasks?.length || 0, 'Todos:', task.todos?.length || 0);
          // Add todos from tasks
          task.todos?.forEach(todo => {
            if (viewFilter === 'all' || viewFilter === 'todos') {
              allItems.push({
                id: todo.id,
                title: todo.title,
                description: todo.description,
                status: todo.status,
                priority: todo.priority,
                due_date: todo.due_date,
                type: 'todo',
                taskTitle: task.title,
                goalTitle: goal.title,
                milestoneTitle: milestone.title
              });
            }
          });

          // Add subtasks 
          task.subtasks?.forEach(subtask => {
            if (viewFilter === 'all' || viewFilter === 'subtasks') {
              allItems.push({
                id: subtask.id,
                title: subtask.title,
                description: subtask.description,
                status: subtask.status,
                priority: subtask.priority,
                due_date: subtask.due_date,
                type: 'subtask',
                taskTitle: task.title,
                goalTitle: goal.title,
                milestoneTitle: milestone.title
              });
            }
          });
        });
      });
    });

    // Add standalone todos (no standalone subtasks expected)
    todos.forEach(todo => {
      if (!allItems.find(item => item.id === todo.id) && (viewFilter === 'all' || viewFilter === 'todos')) {
        allItems.push({
          id: todo.id,
          title: todo.title,
          description: todo.description,
          status: todo.status,
          priority: todo.priority,
          due_date: todo.due_date,
          type: 'todo'
        });
      }
    });

    // Alternative approach: Try to get subtasks from tasks directly
    tasks.forEach(task => {
      if (task.subtasks && (viewFilter === 'all' || viewFilter === 'subtasks')) {
        task.subtasks.forEach(subtask => {
          if (!allItems.find(item => item.id === subtask.id)) {
            allItems.push({
              id: subtask.id,
              title: subtask.title,
              description: subtask.description || '',
              status: subtask.status,
              priority: subtask.priority,
              due_date: subtask.due_date,
              type: 'subtask',
              taskTitle: task.title
            });
          }
        });
      }
    });

    console.log('All items collected:', allItems);
    return allItems;
  };

  const allItems = getAllItems();

  const getItemsForStatus = (status: StatusType) => {
    return allItems.filter(item => item.status === status);
  };

  if (isLoadingGoals || isLoadingTasks || isLoadingTodos) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white">
      <main className="container mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Subtask & Todo Board</h1>
            <p className="text-slate-400">Manage all your subtasks and todos in one Kanban board</p>
          </div>
          
          {/* Navigation Filters */}
          <div className="flex items-center space-x-4 bg-slate-800 rounded-lg p-1">
            <button
              onClick={() => setViewFilter('all')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all ${
                viewFilter === 'all' ? 'bg-slate-700 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <List className="w-4 h-4" />
              <span>All</span>
            </button>
            <button
              onClick={() => setViewFilter('todos')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all ${
                viewFilter === 'todos' ? 'bg-slate-700 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Target className="w-4 h-4" />
              <span>Todos</span>
            </button>
            <button
              onClick={() => setViewFilter('subtasks')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all ${
                viewFilter === 'subtasks' ? 'bg-slate-700 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <CheckSquare className="w-4 h-4" />
              <span>Subtasks</span>
            </button>
          </div>
        </div>

        {/* Kanban Board */}
        <div className="bg-slate-800/50 rounded-2xl p-6 backdrop-blur-sm">
          {(() => {
            // Only show columns that have items
            const visibleColumns = statusColumns.filter(column => {
              const columnItems = getItemsForStatus(column.status);
              return columnItems.length > 0;
            });

            return visibleColumns.length > 0 ? (
              <div className="inline-flex gap-6 min-w-fit">
                <div className="flex gap-6 overflow-x-auto pb-4" style={{ scrollbarWidth: 'thin' }}>
                  {visibleColumns.map((column) => {
                    const columnItems = getItemsForStatus(column.status);
                    
                    return (
                      <div
                        key={column.status}
                        className={`flex-shrink-0 w-80 rounded-xl shadow-lg overflow-hidden bg-gradient-to-b ${column.gradient} border border-white/10`}
                      >
                        {/* Column Header */}
                        <div className={`${column.bgColor} p-4 border-b border-white/10`}>
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-slate-900">{column.title}</h3>
                            <span className="bg-white/20 text-slate-700 text-xs px-2 py-1 rounded-full">
                              {columnItems.length}
                            </span>
                          </div>
                        </div>

                        {/* Column Content */}
                        <div className="p-4 space-y-3 flex-1 max-h-[calc(100vh-16rem)] overflow-y-auto">
                          {columnItems.map((item) => (
                            <div
                              key={`${item.type}-${item.id}`}
                              className={`${column.cardColor} rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow border`}
                            >
                              {/* Item Header */}
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-bold text-slate-900 truncate">{item.title}</h4>
                                  {item.description && (
                                    <p className="text-sm text-slate-600 mt-1 line-clamp-2">{item.description}</p>
                                  )}
                                </div>
                                <div className="ml-2">
                                  {item.status === StatusType.FINISHED && (
                                    <Check className="w-5 h-5 text-green-600" />
                                  )}
                                </div>
                              </div>

                              {/* Parent Information */}
                              {item.taskTitle && (
                                <div className="flex items-center text-xs text-slate-600 mb-2 bg-white/50 rounded px-2 py-1">
                                  <CheckSquare className="w-3 h-3 mr-1" />
                                  <span className="truncate">{item.taskTitle}</span>
                                </div>
                              )}

                              {/* Additional Info */}
                              <div className="flex items-center justify-between text-xs">
                                <span className={`px-2 py-1 rounded-full text-white ${
                                  item.type === 'todo' ? 'bg-green-500' : 'bg-purple-500'
                                }`}>
                                  {item.type === 'subtask' ? 'Subtask' : 'Todo'}
                                </span>
                                
                                {item.due_date && (
                                  <div className="flex items-center text-slate-600">
                                    <Calendar className="w-3 h-3 mr-1" />
                                    <span>{new Date(item.due_date).toLocaleDateString()}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}

                          {/* Add New Button */}
                          <button className="w-full p-3 border-2 border-dashed border-slate-400 rounded-lg text-slate-600 hover:border-slate-500 hover:text-slate-700 transition-colors flex items-center justify-center space-x-2">
                            <Plus className="w-4 h-4" />
                            <span className="text-sm">New Item</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Target className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-medium text-slate-300 mb-2">No items to display</h3>
                <p className="text-slate-500 mb-4">
                  {viewFilter === 'todos' ? 'No todos found' : 
                   viewFilter === 'subtasks' ? 'No subtasks found' : 
                   'No subtasks or todos found'}
                </p>
              </div>
            );
          })()}
        </div>
      </main>
    </div>
  );
};

export default withAuth(TodosPage);
