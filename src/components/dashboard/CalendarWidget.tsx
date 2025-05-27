import React from 'react';
import { TaskItem as Task, TodoItem as Todo, StatusType } from '@/lib/types';

interface CalendarWidgetProps {
  tasks?: Task[];
  todos?: Todo[];
}

export const CalendarWidget: React.FC<CalendarWidgetProps> = ({ tasks = [], todos = [] }) => {
  // Get current date and month
  const today = new Date();
  const currentMonth = today.toLocaleString('default', { month: 'long' });
  const currentYear = today.getFullYear();

  // Get all items (tasks and todos) with due dates
  const items = [
    ...tasks.filter(task => task.due_date),
    ...todos.filter(todo => todo.due_date)
  ].sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime());

  // Get upcoming items (next 7 days)
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);
  const upcomingItems = items.filter(item => {
    const dueDate = new Date(item.due_date!);
    return dueDate >= today && dueDate <= nextWeek;
  });

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold">Calendar</h3>
        <span className="text-gray-600">{currentMonth} {currentYear}</span>
      </div>

      {/* Today's Date */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-600">Today</span>
          <span className="font-medium">{today.toLocaleDateString()}</span>
        </div>
        <div className="h-1 bg-gray-200 rounded-full">
          <div className="h-full bg-blue-500 rounded-full" style={{ width: '100%' }}></div>
        </div>
      </div>

      {/* Upcoming Items */}
      <div>
        <h4 className="text-sm font-medium text-gray-600 mb-3">Upcoming (Next 7 Days)</h4>
        {upcomingItems.length > 0 ? (
          <div className="space-y-3">
            {upcomingItems.map((item, index) => {
              const dueDate = new Date(item.due_date!);
              const isOverdue = dueDate < today;
              const isToday = dueDate.toDateString() === today.toDateString();

              return (
                <div
                  key={`${item.id}-${index}`}
                  className={`p-3 rounded-lg border ${
                    isOverdue ? 'border-red-200 bg-red-50' :
                    isToday ? 'border-blue-200 bg-blue-50' :
                    'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium">{item.title}</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      item.status === StatusType.FINISHED ? 'bg-green-100 text-green-800' :
                      item.status === StatusType.IN_PROGRESS ? 'bg-blue-100 text-blue-800' :
                      item.status === StatusType.CANCELLED ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className={`${
                      isOverdue ? 'text-red-600' :
                      isToday ? 'text-blue-600' :
                      'text-gray-600'
                    }`}>
                      Due: {dueDate.toLocaleDateString()}
                    </span>
                    <span className="text-gray-500">
                      {'milestone_id' in item ? 'Task' : 'Todo'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No upcoming items for the next 7 days.</p>
        )}
      </div>
    </div>
  );
}; 