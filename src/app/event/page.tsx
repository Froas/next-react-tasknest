'use client';

import React, { useState, useEffect } from 'react';
import { withAuth } from '@/hoc/withAuth';
import { Event, StatusType, PriorityType } from '@/lib/types';
import { useStore } from '@/store/useStore';
import dynamic from 'next/dynamic';
const EventForm = dynamic(() => import('@/components/dashboard/EventForm').then(m => m.EventForm), { ssr: false });
import { eventsApi } from '@/lib/api';
import { Plus, Calendar, Filter, MapPin, Clock } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

const EventsPage: React.FC = () => {
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [filterStatus, setFilterStatus] = useState<StatusType | 'all'>('all');
  const [sortBy, setSortBy] = useState<'title' | 'start' | 'end'>('start');
  
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const { 
    events, 
    isLoadingEvents, 
    eventsError,
    fetchEvents,
    addEvent,
    updateEvent,
    deleteEvent: deleteEventFromStore,
  } = useStore();

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleEventSubmit = async (eventData: Partial<Event>) => {
    try {
      const newEvent = await eventsApi.create({
        title: eventData.title!,
        description: eventData.description!,
        status: eventData.status || StatusType.OUTSTANDING,
        start_datetime: eventData.start_datetime,
        end_datetime: eventData.end_datetime,
        location: eventData.location,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      addEvent(newEvent);
      setIsCreatingEvent(false);
    } catch (error) {
      console.error('Error saving event:', error);
    }
  };

  const handleEventDelete = async (eventId: string) => {
    try {
      await eventsApi.delete(eventId);
      deleteEventFromStore(eventId);
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  const getStatusColor = (status: StatusType) => {
    switch (status) {
      case StatusType.FINISHED:
        return 'bg-green-100 text-green-800 border-green-200';
      case StatusType.IN_PROGRESS:
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case StatusType.OUTSTANDING:
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };


  const filteredEvents = events.filter(event => 
    filterStatus === 'all' || event.status === filterStatus
  );

  const sortedEvents = [...filteredEvents].sort((a, b) => {
    switch (sortBy) {
      case 'title':
        return a.title.localeCompare(b.title);
      case 'start':
        return new Date(a.start_datetime || '').getTime() - new Date(b.start_datetime || '').getTime();
      case 'end':
        return new Date(a.end_datetime || '').getTime() - new Date(b.end_datetime || '').getTime();
      default:
        return 0;
    }
  });

  if (isLoadingEvents) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <main className="container mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Events</h1>
            <p className="text-gray-600 dark:text-gray-400">Schedule and manage your important events</p>
          </div>
          
          <button
            onClick={() => setIsCreatingEvent(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Create Event</span>
          </button>
        </div>

        {/* Filters and Sort */}
        <div className="flex items-center space-x-4 mb-6">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as StatusType | 'all')}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value={StatusType.OUTSTANDING}>Outstanding</option>
              <option value={StatusType.IN_PROGRESS}>In Progress</option>
              <option value={StatusType.FINISHED}>Finished</option>
            </select>
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="title">Sort by Title</option>
            <option value="start">Sort by Start Date</option>
            <option value="end">Sort by End Date</option>
          </select>
        </div>

        {/* Events Grid */}
        {sortedEvents.length === 0 ? (
          <div className="text-center py-16">
            <Calendar className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">No events yet</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Create your first event to start scheduling</p>
            <button
              onClick={() => setIsCreatingEvent(true)}
              className="px-6 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
            >
              Create Your First Event
            </button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {sortedEvents.map((event) => (
              <div key={event.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{event.title}</h3>
                    {event.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">{event.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2 mb-4">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(event.status)}`}>
                    {event.status}
                  </span>
                </div>

                {event.location && (
                  <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mb-3">
                    <MapPin className="w-3 h-3 mr-1" />
                    <span>{event.location}</span>
                  </div>
                )}

                <div className="space-y-2 mb-4">
                  {event.start_datetime && (
                    <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                      <Clock className="w-3 h-3 mr-1" />
                      <span>Starts {new Date(event.start_datetime).toLocaleString()}</span>
                    </div>
                  )}
                  {event.end_datetime && (
                    <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                      <Clock className="w-3 h-3 mr-1" />
                      <span>Ends {new Date(event.end_datetime).toLocaleString()}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                  <span>
                    {event.start_datetime && event.end_datetime ? 
                      `${Math.ceil((new Date(event.end_datetime).getTime() - new Date(event.start_datetime).getTime()) / (1000 * 60 * 60))}h duration` :
                      'Duration not set'
                    }
                  </span>
                  <button
                    onClick={() => handleEventDelete(event.id)}
                    className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-xs"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Event Modal */}
        {isCreatingEvent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Create New Event</h3>
              <EventForm
                onSuccess={handleEventSubmit}
                onCancel={() => setIsCreatingEvent(false)}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default withAuth(EventsPage);
