'use client';

import React, { useState } from 'react';
import { useStore } from '@/store/useStore';
import { TaskItem as Task, TodoItem as Todo, Event, StatusType } from '@/lib/types';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

const CalendarPage = () => {
  const { todos, tasks, events, isLoadingTodos, isLoadingTasks, isLoadingEvents } = useStore();
  const [date, setDate] = useState(new Date());

  if (isLoadingTodos || isLoadingTasks || isLoadingEvents) {
    return (
      <div className="flex justify-center items-center h-64 bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800 dark:border-gray-200"></div>
      </div>
    );
  }

  // Get all items (tasks, todos, and events) with due dates
  const items = [
    ...tasks.filter(task => task.due_date).map(task => ({ ...task, itemType: 'Task' as const })),
    ...todos.filter(todo => todo.due_date).map(todo => ({ ...todo, itemType: 'Todo' as const })),
    ...events.filter(event => event.start_datetime).map(event => ({ ...event, itemType: 'Event' as const, due_date: event.start_datetime }))
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
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Calendar</h2>
      <Calendar
        onChange={onDateChange}
        value={date}
        tileContent={tileContent}
        className="mb-6"
      />
      <div>
        <h4 className="text-lg font-medium text-gray-600 dark:text-gray-300 mb-4">Items for {date.toLocaleDateString()}</h4>
        {selectedItems.length > 0 ? (
          <div className="space-y-4">
            {selectedItems.map((item, index) => {
              const dueDate = new Date(item.due_date!);
              const today = new Date();
              const isOverdue = dueDate < today;
              const isToday = dueDate.toDateString() === today.toDateString();

              return (
                <div
                  key={`${item.id}-${index}`}
                  className={`p-4 rounded-lg border ${
                    isOverdue ? 'border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20' :
                    isToday ? 'border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20' :
                    'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-medium text-gray-900 dark:text-white">{item.title}</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      item.status === StatusType.FINISHED ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200' :
                      item.status === StatusType.IN_PROGRESS ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200' :
                      item.status === StatusType.CANCELLED ? 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200' :
                      'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className={`${
                      isOverdue ? 'text-red-600 dark:text-red-400' :
                      isToday ? 'text-blue-600 dark:text-blue-400' :
                      'text-gray-600 dark:text-gray-300'
                    }`}>
                      Due: {dueDate.toLocaleDateString()}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">
                      {item.itemType}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400">No items for this date.</p>
        )}
      </div>
    </div>
  );
};

export default CalendarPage;
