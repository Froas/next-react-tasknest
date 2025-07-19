import React, { useState } from 'react';
import { useStore } from '@/store/useStore';
import { TaskItem as Task, TodoItem as Todo, Event, StatusType } from '@/lib/types';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

interface CalendarWidgetProps {
  tasks?: Task[];
  todos?: Todo[];
}

export const CalendarWidget: React.FC<CalendarWidgetProps> = ({ tasks = [], todos = [] }) => {
  const { todos: storeTodos, tasks: storeTasks, events: storeEvents, isLoadingTodos, isLoadingTasks, isLoadingEvents } = useStore();
  const [date, setDate] = useState(new Date());

  // Use store data if available, otherwise use props
  const allTasks = storeTasks.length > 0 ? storeTasks : tasks;
  const allTodos = storeTodos.length > 0 ? storeTodos : todos;

  // Get all items (tasks, todos, and events) with due dates
  const items = [
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
            <span className="text-xs text-blue-500">{dayItems.length}</span>
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
    <div className="bg-card rounded-xl shadow-sm p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-foreground">Calendar</h3>
      </div>

      <Calendar
        onChange={onDateChange}
        value={date}
        tileContent={tileContent}
        className="mb-6"
      />

      <div>
        <h4 className="text-sm font-medium text-muted-foreground mb-3">Items for {date.toLocaleDateString()}</h4>
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
                    isOverdue ? 'border-accent bg-accent/10' :
                    isToday ? 'border-primary bg-primary/10' :
                    'border-border bg-muted'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium text-foreground">{item.title}</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      item.status === StatusType.FINISHED ? 'bg-primary/20 text-primary' :
                      item.status === StatusType.IN_PROGRESS ? 'bg-primary/10 text-primary' :
                      item.status === StatusType.CANCELLED ? 'bg-accent/20 text-accent-foreground' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className={`${
                      isOverdue ? 'text-accent-foreground' :
                      isToday ? 'text-primary' :
                      'text-muted-foreground'
                    }`}>
                      Due: {dueDate.toLocaleDateString()}
                    </span>
                    <span className="text-muted-foreground">
                      {item.itemType}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">No items for this date.</p>
        )}
      </div>
    </div>
  );
};
