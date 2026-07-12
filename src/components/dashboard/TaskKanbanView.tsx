'use client';

import React, { type CSSProperties, useState } from 'react';
import { TaskItem as Task, TodoItem as Todo, SubtaskItem as Subtask, StatusType } from '@/lib/types';
import { CheckCircle2, Circle, Plus, MoreHorizontal, ChevronDown, ChevronRight } from 'lucide-react';

interface TaskKanbanViewProps {
 tasks: Task[];
 onTaskToggle: (taskId: string, currentStatus: StatusType) => void;
 onSubtaskToggle: (subtaskId: string, currentStatus: StatusType, parentTaskId: string) => void;
 onTodoToggle: (todoId: string, currentStatus: StatusType, parentTaskId: string) => void;
 onAddTask: () => void;
 onQuickAddTask?: (title: string) => Promise<void> | void;
 onAddTodo: (task: Task) => void;
 onAddSubtask: (task: Task) => void;
 onReorderTask?: (draggedTaskId: string, beforeTaskId: string) => Promise<void> | void;
 isUpdating: boolean;
}

interface StatusColumnProps {
 status: StatusType;
 tasks: Task[];
 onTaskToggle: (taskId: string, currentStatus: StatusType) => void;
 onSubtaskToggle: (subtaskId: string, currentStatus: StatusType, parentTaskId: string) => void;
 onTodoToggle: (todoId: string, currentStatus: StatusType, parentTaskId: string) => void;
 onAddTodo: (task: Task) => void;
 onAddSubtask: (task: Task) => void;
 onReorderDrop?: (draggedTaskId: string, beforeTaskId: string) => Promise<void> | void;
 isUpdating: boolean;
}

interface TaskCardProps {
 task: Task;
 onTaskToggle: (taskId: string, currentStatus: StatusType) => void;
 onSubtaskToggle: (subtaskId: string, currentStatus: StatusType, parentTaskId: string) => void;
 onTodoToggle: (todoId: string, currentStatus: StatusType, parentTaskId: string) => void;
 onAddTodo: (task: Task) => void;
 onAddSubtask: (task: Task) => void;
 onReorderDrop?: (draggedTaskId: string, beforeTaskId: string) => Promise<void> | void;
 isUpdating: boolean;
}

interface SubItemCardProps {
 item: Todo | Subtask;
 type: 'todo' | 'subtask';
 parentTaskId: string;
 onToggle: (itemId: string, currentStatus: StatusType, parentTaskId: string) => void;
 isUpdating: boolean;
}

const statusTone = (status: StatusType) => {
 switch (status) {
 case StatusType.FINISHED:
 return 'var(--tn-good, #2f7d50)';
 case StatusType.IN_PROGRESS:
 return 'var(--tn-warn, #c8932a)';
 case StatusType.STARTED:
 return 'var(--tn-accent)';
 case StatusType.ABORTED:
 case StatusType.CANCELLED:
 return 'var(--tn-bad, #c25d63)';
 default:
 return 'var(--tn-fg-muted)';
 }
};

const typeTone = (type: 'todo' | 'subtask') =>
 type === 'todo' ? 'var(--tn-good, #2f7d50)' : 'var(--tn-plum, #8a6594)';

const toneSurface = (tone: string, amount = 10): CSSProperties => ({
 background: `color-mix(in srgb, ${tone} ${amount}%, var(--tn-card))`,
 borderColor: `color-mix(in srgb, ${tone} ${Math.max(amount + 14, 26)}%, transparent)`,
});

const TaskCard: React.FC<TaskCardProps> = ({ task, onTaskToggle, onSubtaskToggle, onTodoToggle, onAddTodo, onAddSubtask, onReorderDrop, isUpdating }) => {
 const [isExpanded, setIsExpanded] = useState(false);
 const [isDragging, setIsDragging] = useState(false);
 const [isDropTarget, setIsDropTarget] = useState(false);
 const isCompleted = task.status === StatusType.FINISHED;
 const taskTodos = task.todos || [];
 const taskSubtasks = task.subtasks || [];
 const hasSubItems = taskTodos.length > 0 || taskSubtasks.length > 0;
 
 return (
 <div
 draggable
 onDragStart={(e) => {
 e.dataTransfer.effectAllowed = 'move';
 e.dataTransfer.setData('application/x-tasknest-task-id', task.id);
 e.dataTransfer.setData('application/x-tasknest-from-milestone-id', task.milestone_id ?? '');
 setIsDragging(true);
 }}
 onDragEnd={() => {
 setIsDragging(false);
 setIsDropTarget(false);
 }}
 onDragOver={(e) => {
 if (!onReorderDrop) return;
 if (!e.dataTransfer.types.includes('application/x-tasknest-task-id')) return;
 // Only intercept reorder within the same milestone column.
 const fromMilestoneId = e.dataTransfer.getData('application/x-tasknest-from-milestone-id');
 if (fromMilestoneId && fromMilestoneId !== (task.milestone_id ?? '')) return;
 e.preventDefault();
 e.stopPropagation();
 e.dataTransfer.dropEffect = 'move';
 setIsDropTarget(true);
 }}
 onDragLeave={() => setIsDropTarget(false)}
 onDrop={(e) => {
 if (!onReorderDrop) return;
 const draggedId = e.dataTransfer.getData('application/x-tasknest-task-id');
 if (!draggedId || draggedId === task.id) {
 setIsDropTarget(false);
 return;
 }
 const fromMilestoneId = e.dataTransfer.getData('application/x-tasknest-from-milestone-id');
 if (fromMilestoneId && fromMilestoneId !== (task.milestone_id ?? '')) return;
 e.preventDefault();
 e.stopPropagation();
 setIsDropTarget(false);
 onReorderDrop(draggedId, task.id);
 }}
 className={`bg-card dark:bg-card border rounded-lg shadow-sm hover:shadow-md transition-shadow mb-3 cursor-grab active:cursor-grabbing ${
 isDragging ? 'opacity-50' : ''
 }`}
 style={{
 borderColor: isDropTarget ? 'var(--tn-accent)' : undefined,
 boxShadow: isDropTarget ? '0 0 0 2px color-mix(in srgb, var(--tn-accent) 22%, transparent)' : undefined,
 }}
 >
 <div className="p-3">
 <div className="flex items-start space-x-2">
 <button
 onClick={() => onTaskToggle(task.id, task.status)}
 disabled={isUpdating}
 className="flex-shrink-0 mt-1 rounded"
 >
 {isCompleted ? (
 <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--tn-good, #2f7d50)' }} />
 ) : (
 <Circle className="w-4 h-4 text-muted-foreground hover:text-foreground" />
 )}
 </button>
 
 <div className="flex-1 min-w-0">
 <h4 className={`text-sm font-medium mb-1 ${isCompleted ? 'line-through text-muted-foreground dark:text-muted-foreground' : 'text-foreground'}`}>
 {task.title}
 </h4>
 {task.description && (
 <p className={`text-xs mb-2 ${isCompleted ? 'text-muted-foreground dark:text-muted-foreground' : 'text-foreground dark:text-muted-foreground/60'}`}>
 {task.description}
 </p>
 )}
 
 {/* Sub-items summary */}
 {hasSubItems && (
 <div className="flex items-center space-x-2 text-xs text-muted-foreground dark:text-muted-foreground mb-2">
 {taskTodos.length > 0 && (
 <span className="px-2 py-1 rounded" style={toneSurface(typeTone('todo'), 12)}>
 {taskTodos.filter(t => t.status === StatusType.FINISHED).length}/{taskTodos.length} todos
 </span>
 )}
 {taskSubtasks.length > 0 && (
 <span className="px-2 py-1 rounded" style={toneSurface(typeTone('subtask'), 12)}>
 {taskSubtasks.filter(s => s.status === StatusType.FINISHED).length}/{taskSubtasks.length} subtasks
 </span>
 )}
 </div>
 )}
 
 {/* Action buttons */}
 <div className="flex items-center justify-between">
 <div className="flex items-center space-x-1">
 <button
 onClick={() => onAddTodo(task)}
 className="px-2 py-1 text-xs rounded transition-colors"
 style={{ color: typeTone('todo') }}
 >
 + Todo
 </button>
 <button
 onClick={() => onAddSubtask(task)}
 className="px-2 py-1 text-xs rounded transition-colors"
 style={{ color: typeTone('subtask') }}
 >
 + Subtask
 </button>
 </div>
 
 {hasSubItems && (
 <button
 onClick={() => setIsExpanded(!isExpanded)}
 className="p-1 text-muted-foreground dark:text-muted-foreground hover:text-foreground dark:hover:text-muted-foreground/60 rounded"
 >
 {isExpanded ? (
 <ChevronDown className="w-3 h-3" />
 ) : (
 <ChevronRight className="w-3 h-3" />
 )}
 </button>
 )}
 </div>
 </div>
 </div>
 
 {/* Expanded sub-items */}
 {isExpanded && hasSubItems && (
 <div className="mt-3 pt-3 border-t border-border dark:border-border">
 {taskTodos.length > 0 && (
 <div className="mb-3">
 <h6 className="text-xs font-medium text-foreground dark:text-muted-foreground/60 mb-1">Todos</h6>
 <div className="space-y-1">
 {taskTodos.map((todo) => (
 <SubItemCard
 key={todo.id}
 item={todo}
 type="todo"
 parentTaskId={task.id}
 onToggle={(id, status, parentId) => onTodoToggle && onTodoToggle(id, status, parentId)}
 isUpdating={isUpdating}
 />
 ))}
 </div>
 </div>
 )}
 
 {taskSubtasks.length > 0 && (
 <div>
 <h6 className="text-xs font-medium text-foreground dark:text-muted-foreground/60 mb-1">Subtasks</h6>
 <div className="space-y-1">
 {taskSubtasks.map((subtask) => (
 <SubItemCard
 key={subtask.id}
 item={subtask}
 type="subtask"
 parentTaskId={task.id}
 onToggle={(id, status, parentId) => onSubtaskToggle && onSubtaskToggle(id, status, parentId)}
 isUpdating={isUpdating}
 />
 ))}
 </div>
 </div>
 )}
 </div>
 )}
 </div>
 </div>
 );
};

const SubItemCard: React.FC<SubItemCardProps> = ({ item, type, parentTaskId, onToggle, isUpdating }) => {
 const isCompleted = item.status === StatusType.FINISHED;
 const tone = typeTone(type);
 
 return (
 <div className="border rounded p-2 hover:shadow-sm transition-shadow" style={toneSurface(tone, 8)}>
 <div className="flex items-start space-x-2">
 <div className="flex items-center space-x-1 flex-shrink-0 mt-0.5">
 <div className="w-1.5 h-1.5 rounded-full" style={{ background: tone }}></div>
 <button
 onClick={() => onToggle(item.id, item.status, parentTaskId)}
 disabled={isUpdating}
 className="rounded"
 >
 {isCompleted ? (
 <CheckCircle2 className="w-3 h-3" style={{ color: 'var(--tn-good, #2f7d50)' }} />
 ) : (
 <Circle className="w-3 h-3 text-muted-foreground hover:text-foreground" />
 )}
 </button>
 </div>
 
 <div className="flex-1 min-w-0">
 <h5 className={`text-xs font-medium ${isCompleted ? 'line-through text-muted-foreground dark:text-muted-foreground' : 'text-foreground'}`}>
 {item.title}
 </h5>
 {item.description && (
 <p className={`text-xs mt-0.5 ${isCompleted ? 'text-muted-foreground dark:text-muted-foreground' : 'text-foreground dark:text-muted-foreground/60'}`}>
 {item.description}
 </p>
 )}
 </div>
 </div>
 </div>
 );
};

const StatusColumn: React.FC<StatusColumnProps> = ({
 status,
 tasks,
 onTaskToggle,
 onSubtaskToggle,
 onTodoToggle,
 onAddTodo,
 onAddSubtask,
 onReorderDrop,
 isUpdating
}) => {
 const statusLabels: Record<StatusType, string> = {
 [StatusType.OUTSTANDING]: 'Outstanding',
 [StatusType.STARTED]: 'Started',
 [StatusType.IN_PROGRESS]: 'In Progress',
 [StatusType.FINISHED]: 'Finished',
 [StatusType.CLOSED]: 'Closed',
 [StatusType.ABORTED]: 'Aborted',
 [StatusType.CANCELLED]: 'Cancelled'
 };

 return (
 <div className="md:flex-shrink-0 w-full md:w-80 p-2">
 <div className="rounded-lg border-2 h-full min-h-[16rem]" style={toneSurface(statusTone(status), 8)}>
 <div className="p-3 border-b border-current border-opacity-20">
 <h3 className="text-sm font-semibold text-foreground">{statusLabels[status]}</h3>
 <p className="text-xs text-foreground dark:text-muted-foreground/60">{tasks.length} tasks</p>
 </div>
 <div className="p-3 max-h-96 overflow-y-auto">
 {tasks.map((task) => (
 <TaskCard
 key={task.id}
 task={task}
 onTaskToggle={onTaskToggle}
 onSubtaskToggle={onSubtaskToggle}
 onTodoToggle={onTodoToggle}
 onAddTodo={onAddTodo}
 onAddSubtask={onAddSubtask}
 onReorderDrop={onReorderDrop}
 isUpdating={isUpdating}
 />
 ))}
 </div>
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
 onQuickAddTask,
 onAddTodo,
 onAddSubtask,
 onReorderTask,
 isUpdating
}) => {
 const [quickDraft, setQuickDraft] = useState('');
 const [quickBusy, setQuickBusy] = useState(false);

 const submitQuick = async (e: React.FormEvent) => {
 e.preventDefault();
 const title = quickDraft.trim();
 if (!title || !onQuickAddTask) return;
 setQuickBusy(true);
 try {
 await onQuickAddTask(title);
 setQuickDraft('');
 } finally {
 setQuickBusy(false);
 }
 };
 const statuses: StatusType[] = [
 StatusType.OUTSTANDING,
 StatusType.STARTED,
 StatusType.IN_PROGRESS,
 StatusType.FINISHED,
 StatusType.CLOSED,
 StatusType.ABORTED,
 StatusType.CANCELLED
 ];
 
 const tasksByStatus = statuses.reduce((acc, status) => {
 acc[status] = tasks.filter(task => task.status === status);
 return acc;
 }, {} as Record<StatusType, Task[]>);

 // Only show columns that have tasks
 const visibleColumns = statuses.filter(status => tasksByStatus[status].length > 0);

 return (
 <div className="w-full">
 {/* Header with Add Task button */}
 <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
 <div className="flex items-center space-x-3">
 <h4 className="text-sm font-medium text-foreground">Task Board</h4>
 <span className="text-xs text-muted-foreground dark:text-muted-foreground bg-muted dark:bg-card px-2 py-1 rounded-full">
 {tasks.length} tasks
 </span>
 </div>
 <div className="flex items-center space-x-2 flex-1 sm:flex-initial sm:max-w-md min-w-0">
 {onQuickAddTask && (
 <form onSubmit={submitQuick} className="flex items-center space-x-1 flex-1 min-w-0">
 <input
 type="text"
 value={quickDraft}
 onChange={(e) => setQuickDraft(e.target.value)}
 placeholder="Quick add task..."
 disabled={quickBusy}
 className="filter-input flex-1 min-w-0 disabled:opacity-50"
 />
 <button
 type="submit"
 disabled={!quickDraft.trim() || quickBusy}
 className="px-2 py-1.5 text-sm bg-muted dark:bg-card text-foreground dark:text-muted-foreground/60 rounded-md hover:bg-muted dark:hover:bg-muted disabled:opacity-50"
 title="Quick add task (or open the full form for more fields)"
 >
 ↵
 </button>
 </form>
 )}
 <button
 onClick={onAddTask}
 className="btn btn-primary flex-shrink-0"
 >
 <Plus className="w-3 h-3" />
 <span>Full form</span>
 </button>
 </div>
 </div>

 {/* Kanban Board */}
 {visibleColumns.length > 0 ? (
 <div className="md:flex md:gap-4 md:overflow-x-auto md:pb-4 space-y-4 md:space-y-0" style={{ WebkitOverflowScrolling: 'touch' }}>
 {visibleColumns.map((status) => (
 <StatusColumn
 key={status}
 status={status}
 tasks={tasksByStatus[status]}
 onTaskToggle={onTaskToggle}
 onSubtaskToggle={onSubtaskToggle}
 onTodoToggle={onTodoToggle}
 onAddTodo={onAddTodo}
 onAddSubtask={onAddSubtask}
 onReorderDrop={onReorderTask}
 isUpdating={isUpdating}
 />
 ))}
 </div>
 ) : (
 <div className="text-center py-12 rounded-lg border-2 border-dashed" style={{ background: 'var(--tn-surface-2, var(--tn-hover))', borderColor: 'color-mix(in srgb, var(--tn-fg-muted) 26%, transparent)' }}>
 <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2" style={{ background: 'var(--tn-chip)' }}>
 <Plus className="w-5 h-5 text-muted-foreground dark:text-muted-foreground" />
 </div>
 <p className="text-sm text-foreground dark:text-muted-foreground/60 mb-2">No tasks yet</p>
 <button
 onClick={onAddTask}
 className="text-xs font-medium"
 style={{ color: 'var(--tn-accent)' }}
 >
 Add your first task
 </button>
 </div>
 )}
 </div>
 );
};

export default TaskKanbanView;
