import React, { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { TaskItem as Task, TodoItem as Todo, Event, StatusType } from '@/lib/types';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

interface CalendarWidgetProps {
  tasks?: Task[];
  todos?: Todo[];
}

export const CalendarWidget: React.FC<CalendarWidgetProps> = ({ tasks = [], todos = [] }) => {
  const { goals, events: storeEvents } = useStore();
  const [date, setDate] = useState(new Date());

  // No useEffect needed - data should be fetched by parent component

  // Extract all items from goals structure
  const allTasks: (Task & { goalTitle?: string; milestoneTitle?: string })[] = [];
  const allTodos: (Todo & { taskTitle?: string; goalTitle?: string })[] = [];
  const allMilestones: any[] = [];
  const allGoals: any[] = [];
  
  goals.forEach(goal => {
    // Add goal if it has an end date
    if (goal.end_datetime) {
      allGoals.push({
        ...goal,
        due_date: goal.end_datetime,
        itemType: 'Goal'
      });
    }

    goal.milestones?.forEach(milestone => {
      // Add milestone if it has a due date
      if (milestone.due_date || milestone.end_datetime) {
        allMilestones.push({
          ...milestone,
          due_date: milestone.due_date || milestone.end_datetime,
          itemType: 'Milestone'
        });
      }

      if (milestone.tasks) {
        milestone.tasks.forEach(task => {
          allTasks.push({...task, goalTitle: goal.title, milestoneTitle: milestone.title});
          if (task.todos) {
            task.todos.forEach(todo => allTodos.push({...todo, taskTitle: task.title, goalTitle: goal.title}));
          }
        });
      }
    });
  });

  // Get all items (goals, milestones, tasks, todos, and events) with due dates
  const items = [
    ...allGoals,
    ...allMilestones,
    ...allTasks.filter(task => task.due_date).map(task => ({ ...task, itemType: 'Task' as const })),
    ...allTodos.filter(todo => todo.due_date).map(todo => ({ ...todo, itemType: 'Todo' as const })),
    ...storeEvents.filter(event => event.start_datetime).map(event => ({ ...event, itemType: 'Event' as const, due_date: event.start_datetime }))
  ];

  // Function to get items for a specific date
  const getItemsForDate = (selectedDate: Date) => {
    return items.filter(item => {
      const itemDate = new Date(item.due_date!);
      return itemDate.toDateString() === selectedDate.toDateString();
    });
  };

  const tileContent = ({ date, view }: { date: Date; view: string }) => {
    if (view === 'month') {
      const dayItems = getItemsForDate(date);
      if (dayItems.length > 0) {
        return (
          <div className="flex justify-center items-center">
            <span className="text-xs text-blue-500 dark:text-blue-400">{dayItems.length}</span>
          </div>
        );
      }
    }
    return null;
  };

  const onDateChange = (value: any, event: React.MouseEvent<HTMLButtonElement>) => {
    if (value instanceof Date) {
      setDate(value);
    }
  };

  const selectedItems = getItemsForDate(date);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Calendar</h3>
      </div>

      <Calendar
        onChange={onDateChange}
        value={date}
        tileContent={tileContent}
        className="mb-6"
      />

      <div>
        <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">Items for {date.toLocaleDateString()}</h4>
        {selectedItems.length > 0 ? (
          <div className="space-y-3">
            {selectedItems.map((item, index) => {
              const dueDate = new Date(item.due_date!);
              const today = new Date();
              const isOverdue = dueDate < today;
              const isToday = dueDate.toDateString() === today.toDateString();

              return (
                <div
                  key={`${item.id}-${index}`}
                  className={`p-3 rounded-lg border ${
                    isOverdue ? 'border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20' :
                    isToday ? 'border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20' :
                    'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex-1">
                      <span className="font-medium text-gray-900 dark:text-white">{item.title}</span>
                      {(item as any).goalTitle && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {item.itemType === 'Todo' && (item as any).taskTitle && `${(item as any).taskTitle} • `}
                          {item.itemType === 'Task' && (item as any).milestoneTitle && `${(item as any).milestoneTitle} • `}
                          {(item as any).goalTitle}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        item.status === StatusType.FINISHED ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200' :
                        item.status === StatusType.IN_PROGRESS ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200' :
                        item.status === StatusType.CANCELLED ? 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200' :
                        'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                      }`}>
                        {item.status}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        item.itemType === 'Goal' ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200' :
                        item.itemType === 'Milestone' ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200' :
                        item.itemType === 'Task' ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200' :
                        item.itemType === 'Todo' ? 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200' :
                        'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                      }`}>
                        {item.itemType}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className={`${
                      isOverdue ? 'text-red-600 dark:text-red-400' :
                      isToday ? 'text-blue-600 dark:text-blue-400' :
                      'text-gray-600 dark:text-gray-300'
                    }`}>
                      Due: {dueDate.toLocaleDateString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-sm">No items for this date.</p>
        )}
      </div>
    </div>
  );
};
