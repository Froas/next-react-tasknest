'use client';

import React, { useState } from 'react';
import { TaskItem as Task, TodoItem as Todo, SubtaskItem as Subtask, StatusType } from '@/lib/types';
import { CheckCircle2, Circle, Plus, MoreHorizontal, ChevronDown, ChevronRight } from 'lucide-react';

interface TaskKanbanViewProps {
  tasks: Task[];
  onTaskToggle: (taskId: string, currentStatus: StatusType) => void;
  onSubtaskToggle: (subtaskId: string, currentStatus: StatusType, parentTaskId: string) => void;
  onTodoToggle: (todoId: string, currentStatus: StatusType, parentTaskId: string) => void;
  onAddTask: () => void;
  onAddTodo: (task: Task) => void;
  onAddSubtask: (task: Task) => void;
  isUpdating: boolean;
}

interface TaskCardProps {
  task: Task;
  onTaskToggle: (taskId: string, currentStatus: StatusType) => void;
  onAddTodo: (task: Task) => void;
  onAddSubtask: (task: Task) => void;
  isUpdating: boolean;
}

interface SubItemCardProps {
  item: Todo | Subtask;
  type: 'todo' | 'subtask';
  parentTaskId: string;
  onToggle: (itemId: string, currentStatus: StatusType, parentTaskId: string) => void;
  isUpdating: boolean;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onTaskToggle, onAddTodo, onAddSubtask, isUpdating }) => {
  const isCompleted = task.status === StatusType.FINISHED;
  
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start space-x-3">
        <button
          onClick={() => onTaskToggle(task.id, task.status)}
          disabled={isUpdating}
          className="flex-shrink-0 mt-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
        >
          {isCompleted ? (
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          ) : (
            <Circle className="w-5 h-5 text-gray-400 hover:text-gray-600" />
          )}
        </button>
        
        <div className="flex-1 min-w-0">
          <h4 className={`text-sm font-medium mb-1 ${isCompleted ? 'line-through text-gray-500' : 'text-gray-900'}`}>
            {task.title}
          </h4>
          {task.description && (
            <p className={`text-xs mb-3 ${isCompleted ? 'text-gray-400' : 'text-gray-600'}`}>
              {task.description}
            </p>
          )}
          
          {/* Quick stats */}
          <div className="flex items-center space-x-3 text-xs text-gray-500 mb-3">
            {task.subtasks && task.subtasks.length > 0 && (
              <span>{task.subtasks.length} subtasks</span>
            )}
            {task.todos && task.todos.length > 0 && (
              <span>{task.todos.length} todos</span>
            )}
          </div>
          
          {/* Action buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onAddSubtask(task)}
              className="px-2 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
            >
              + Subtask
            </button>
            <button
              onClick={() => onAddTodo(task)}
              className="px-2 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
            >
              + Todo
            </button>
          </div>
        </div>
        
        <button className="p-1 text-gray-400 hover:text-gray-600 rounded">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

const SubItemCard: React.FC<SubItemCardProps> = ({ item, type, parentTaskId, onToggle, isUpdating }) => {
  const isCompleted = item.status === StatusType.FINISHED;
  const bgColor = type === 'todo' ? 'bg-blue-50 border-blue-200' : 'bg-purple-50 border-purple-200';
  const dotColor = type === 'todo' ? 'bg-blue-400' : 'bg-purple-400';
  
  return (
    <div className={`border rounded-lg p-3 ${bgColor} hover:shadow-sm transition-shadow`}>
      <div className="flex items-start space-x-3">
        <div className="flex items-center space-x-2 flex-shrink-0 mt-0.5">
          <div className={`w-2 h-2 rounded-full ${dotColor}`}></div>
          <button
            onClick={() => onToggle(item.id, item.status, parentTaskId)}
            disabled={isUpdating}
            className="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
          >
            {isCompleted ? (
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            ) : (
              <Circle className="w-4 h-4 text-gray-400 hover:text-gray-600" />
            )}
          </button>
        </div>
        
        <div className="flex-1 min-w-0">
          <h5 className={`text-sm font-medium mb-1 ${isCompleted ? 'line-through text-gray-500' : 'text-gray-900'}`}>
            {item.title}
          </h5>
          {item.description && (
            <p className={`text-xs ${isCompleted ? 'text-gray-400' : 'text-gray-600'}`}>
              {item.description}
            </p>
          )}
        </div>
        
        <span className={`text-xs px-2 py-1 rounded-full ${type === 'todo' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
          {type === 'todo' ? 'Todo' : 'Subtask'}
        </span>
      </div>
    </div>
  );
};

const TaskKanbanView: React.FC<TaskKanbanViewProps> = ({
  tasks,
  onTaskToggle,
  onSubtaskToggle,
  onTodoToggle,
  onAddTask,
  onAddTodo,
  onAddSubtask,
  isUpdating
}) => {
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  
  // Collect all todos and subtasks from all tasks
  const allTodos: (Todo & { parentTask: Task })[] = [];
  const allSubtasks: (Subtask & { parentTask: Task })[] = [];
  
  tasks.forEach(task => {
    if (task.todos) {
      task.todos.forEach(todo => allTodos.push({ ...todo, parentTask: task }));
    }
    if (task.subtasks) {
      task.subtasks.forEach(subtask => allSubtasks.push({ 
        ...subtask,
        task_id: task.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        parentTask: task 
      } as Subtask & { parentTask: Task }));
    }
  });

  return (
    <div className="space-y-4">
      {/* Tasks List */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <h4 className="text-sm font-medium text-gray-900">Tasks</h4>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
              {tasks.length} tasks, {allTodos.length} todos, {allSubtasks.length} subtasks
            </span>
          </div>
          <button
            onClick={onAddTask}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            + Add Task
          </button>
        </div>

        {tasks.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-2">
              <Plus className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-sm text-gray-600 mb-2">No tasks yet</p>
            <button
              onClick={onAddTask}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              Add your first task
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => {
              const isExpanded = expandedTaskId === task.id;
              const isCompleted = task.status === StatusType.FINISHED;
              const taskTodos = task.todos || [];
              const taskSubtasks = task.subtasks || [];
              
              return (
                <div key={task.id} className="bg-white border border-gray-200 rounded-lg">
                  {/* Task Header */}
                  <div className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 flex-1">
                        <button
                          onClick={() => onTaskToggle(task.id, task.status)}
                          disabled={isUpdating}
                          className="flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          ) : (
                            <Circle className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                          )}
                        </button>
                        
                        <div className="flex-1 min-w-0">
                          <h5 className={`text-sm font-medium ${isCompleted ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                            {task.title}
                          </h5>
                          {task.description && (
                            <p className={`text-xs mt-1 ${isCompleted ? 'text-gray-400' : 'text-gray-600'}`}>
                              {task.description}
                            </p>
                          )}
                        </div>
                        
                        {(taskTodos.length > 0 || taskSubtasks.length > 0) && (
                          <div className="flex items-center space-x-2 text-xs text-gray-500">
                            {taskTodos.length > 0 && (
                              <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                {taskTodos.filter(t => t.status === StatusType.FINISHED).length}/{taskTodos.length} todos
                              </span>
                            )}
                            {taskSubtasks.length > 0 && (
                              <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded">
                                {taskSubtasks.filter(s => s.status === StatusType.FINISHED).length}/{taskSubtasks.length} subtasks
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => onAddTodo(task)}
                          className="p-1 text-blue-600 hover:text-blue-800 text-xs"
                          title="Add Todo"
                        >
                          + Todo
                        </button>
                        <button
                          onClick={() => onAddSubtask(task)}
                          className="p-1 text-purple-600 hover:text-purple-800 text-xs"
                          title="Add Subtask"
                        >
                          + Subtask
                        </button>
                        {(taskTodos.length > 0 || taskSubtasks.length > 0) && (
                          <button
                            onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                            className="p-1 text-gray-400 hover:text-gray-600"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Task Details */}
                  {isExpanded && (taskTodos.length > 0 || taskSubtasks.length > 0) && (
                    <div className="border-t border-gray-100 p-3 bg-gray-50">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Todos */}
                        {taskTodos.length > 0 && (
                          <div>
                            <h6 className="text-xs font-medium text-gray-700 mb-2">Todos</h6>
                            <div className="space-y-1">
                              {taskTodos.map((todo) => (
                                <SubItemCard
                                  key={todo.id}
                                  item={todo}
                                  type="todo"
                                  parentTaskId={task.id}
                                  onToggle={onTodoToggle}
                                  isUpdating={isUpdating}
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Subtasks */}
                        {taskSubtasks.length > 0 && (
                          <div>
                            <h6 className="text-xs font-medium text-gray-700 mb-2">Subtasks</h6>
                            <div className="space-y-1">
                              {taskSubtasks.map((subtask) => (
                                <SubItemCard
                                  key={subtask.id}
                                  item={subtask}
                                  type="subtask"
                                  parentTaskId={task.id}
                                  onToggle={onSubtaskToggle}
                                  isUpdating={isUpdating}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskKanbanView;