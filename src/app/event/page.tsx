'use client';

import React, { useState, useEffect } from 'react';
import { withAuth } from '@/hoc/withAuth';
import { Event, StatusType } from '@/lib/types';
import { useStore } from '@/store/useStore';
import { useShallow } from 'zustand/react/shallow';
import dynamic from 'next/dynamic';
const EventForm = dynamic(() => import('@/components/dashboard/EventForm').then(m => m.EventForm), { ssr: false });
import { eventsApi, trashApi } from '@/lib/api';
import { toast } from '@/store/useToast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { GridSkeleton } from '@/components/ui/Skeletons';
import { usePersistentState } from '@/lib/usePersistentState';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import { Plus, Calendar, Filter, MapPin, Clock } from 'lucide-react';

const EventsPage: React.FC = () => {
 const [isCreatingEvent, setIsCreatingEvent] = useState(false);
 const [filterStatus, setFilterStatus] = usePersistentState<StatusType | 'all'>('event:filter', 'all');
 const [sortBy, setSortBy] = usePersistentState<'title' | 'start' | 'end'>('event:sort', 'start');
 const [isDeleting, setIsDeleting] = useState(false);
 const [search, setSearch] = useState('');
 const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
 const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
 useDocumentTitle('Events');
 
 const events = useStore((s) => s.events);
 const isLoadingEvents = useStore((s) => s.isLoadingEvents);
 const { fetchEvents, addEvent, deleteEvent: deleteEventFromStore } = useStore(
 useShallow((s) => ({
 fetchEvents: s.fetchEvents,
 addEvent: s.addEvent,
 deleteEvent: s.deleteEvent,
 }))
 );

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
 });
 addEvent(newEvent);
 setIsCreatingEvent(false);
 } catch (error) {
 console.error('Error saving event:', error);
 toast.error('Failed to save event');
 }
 };

 const softDeleteEvent = async (id: string) => {
 const event = events.find((e) => e.id === id);
 if (!event) return;
 deleteEventFromStore(id);
 try {
 await eventsApi.delete(id);
 } catch (err) {
 console.error('Soft-delete failed:', err);
 addEvent(event);
 toast.error('Failed to delete event — restored');
 return;
 }
 toast.withAction(
 'info',
 `"${event.title}" deleted`,
 {
 label: 'Undo',
 run: async () => {
 try {
 await trashApi.restore('event', id);
 addEvent(event);
 } catch (err) {
 console.error('Event restore failed:', err);
 toast.error('Failed to restore event');
 }
 },
 },
 { ttlMs: 5000 }
 );
 };

 const toggleSelected = (id: string) => {
 setSelectedIds((prev) => {
 const next = new Set(prev);
 if (next.has(id)) next.delete(id);
 else next.add(id);
 return next;
 });
 };

 const performBulkDelete = async () => {
 if (selectedIds.size === 0) return;
 setIsDeleting(true);
 const ids = Array.from(selectedIds);
 const results = await Promise.allSettled(ids.map((id) => eventsApi.delete(id)));
 let succeeded = 0;
 let failed = 0;
 results.forEach((res, i) => {
 if (res.status === 'fulfilled') {
 deleteEventFromStore(ids[i]);
 succeeded += 1;
 } else {
 console.error(`Failed to delete event ${ids[i]}:`, res.reason);
 failed += 1;
 }
 });
 setIsDeleting(false);
 setConfirmBulkDelete(false);
 setSelectedIds(new Set());
 if (succeeded > 0) toast.success(`Deleted ${succeeded} event${succeeded === 1 ? '' : 's'}`);
 if (failed > 0) toast.error(`Failed to delete ${failed} event${failed === 1 ? '' : 's'}`);
 };

 const getStatusColor = (status: StatusType) => {
 switch (status) {
 case StatusType.FINISHED:
 return 'status-finished';
 case StatusType.IN_PROGRESS:
 return 'status-in-progress';
 case StatusType.OUTSTANDING:
 return 'status-outstanding';
 default:
 return '';
 }
 };


 const searchLower = search.trim().toLowerCase();
 const filteredEvents = events.filter((event) => {
 if (filterStatus !== 'all' && event.status !== filterStatus) return false;
 if (!searchLower) return true;
 return (
 event.title.toLowerCase().includes(searchLower) ||
 (event.description ?? '').toLowerCase().includes(searchLower) ||
 (event.location ?? '').toLowerCase().includes(searchLower)
 );
 });

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

 if (isLoadingEvents && events.length === 0) {
 return (
 <div className="page">
 <GridSkeleton count={6} />
 </div>
 );
 }

 return (
 <div className="page">
 {/* Page Header */}
 <div className="flex items-center justify-between mb-8">
 <div>
 <h1 className="page-title">Events</h1>
 <p className="page-lede">Calendar items linked to your goals and milestones.</p>
 </div>
 
 <div className="flex items-center space-x-2">
 {selectedIds.size > 0 && (
 <>
 <span className="text-sm text-foreground dark:text-muted-foreground/60">
 {selectedIds.size} selected
 </span>
 <button
 onClick={() => setSelectedIds(new Set())}
 className="px-3 py-2 text-sm text-foreground dark:text-muted-foreground/60 bg-muted dark:bg-card rounded-lg hover:bg-muted dark:hover:bg-muted"
 >
 Clear
 </button>
 <button
 onClick={() => setConfirmBulkDelete(true)}
 className="btn" style={{background:'var(--tn-bad, #c25d63)', color:'#fff'}}
 >
 Delete selected
 </button>
 </>
 )}
 <button
 onClick={() => setIsCreatingEvent(true)}
 className="btn btn-primary"
 >
 <Plus className="w-5 h-5" />
 <span>Create Event</span>
 </button>
 </div>
 </div>

 {/* Filters and Sort */}
 <div className="filter-toolbar no-print">
 <input
 type="search"
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 placeholder="Search by title, description or location..."
 aria-label="Search events"
 className="filter-input"
 />
 <div className="filter-actions">
 <Filter className="w-4 h-4 filter-icon" />
 <select
 value={filterStatus}
 onChange={(e) => setFilterStatus(e.target.value as StatusType | 'all')}
 className="filter-select"
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
 className="filter-select"
 >
 <option value="title">Sort by Title</option>
 <option value="start">Sort by Start Date</option>
 <option value="end">Sort by End Date</option>
 </select>
 </div>

 {/* Events Grid */}
 {sortedEvents.length === 0 ? (
 <div className="text-center py-16">
 <Calendar className="w-16 h-16 mx-auto text-muted-foreground/60 dark:text-foreground mb-4" />
 <h3 className="text-xl font-medium text-foreground mb-2">No events yet</h3>
 <p className="text-foreground dark:text-muted-foreground mb-6">Create your first event to start scheduling</p>
 <button
 onClick={() => setIsCreatingEvent(true)}
 className="btn btn-primary"
 >
 Create Your First Event
 </button>
 </div>
 ) : (
 <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
 {sortedEvents.map((event) => {
 const isSelected = selectedIds.has(event.id);
 return (
 <div
 key={event.id}
 className="relative bg-card dark:bg-card rounded-lg border p-6 hover:shadow-md transition-shadow"
 style={{
 borderColor: isSelected ? 'var(--tn-accent)' : undefined,
 boxShadow: isSelected ? '0 0 0 2px color-mix(in srgb, var(--tn-accent) 22%, transparent)' : undefined,
 }}
 >
 <input
 type="checkbox"
 checked={isSelected}
 onChange={() => toggleSelected(event.id)}
 aria-label={`Select event ${event.title}`}
 className="absolute top-4 right-4 h-4 w-4 rounded border-border"
 style={{ accentColor: 'var(--tn-accent)' }}
 />
 <div className="flex items-start mb-4 pr-8">
 <div className="flex-1">
 <h3 className="text-lg font-semibold text-foreground mb-2">{event.title}</h3>
 {event.description && (
 <p className="text-sm text-foreground dark:text-muted-foreground/60 mb-3 line-clamp-2">{event.description}</p>
 )}
 </div>
 </div>

 <div className="flex items-center space-x-2 mb-4">
 <span className={`pill ${getStatusColor(event.status)}`}>
 {event.status}
 </span>
 </div>

 {event.location && (
 <div className="flex items-center text-xs text-muted-foreground dark:text-muted-foreground mb-3">
 <MapPin className="w-3 h-3 mr-1" />
 <span>{event.location}</span>
 </div>
 )}

 <div className="space-y-2 mb-4">
 {event.start_datetime && (
 <div className="flex items-center text-xs text-muted-foreground dark:text-muted-foreground">
 <Clock className="w-3 h-3 mr-1" />
 <span>Starts {new Date(event.start_datetime).toLocaleString()}</span>
 </div>
 )}
 {event.end_datetime && (
 <div className="flex items-center text-xs text-muted-foreground dark:text-muted-foreground">
 <Clock className="w-3 h-3 mr-1" />
 <span>Ends {new Date(event.end_datetime).toLocaleString()}</span>
 </div>
 )}
 </div>

 <div className="flex items-center justify-between text-sm text-muted-foreground dark:text-muted-foreground">
 <span>
 {event.start_datetime && event.end_datetime ? 
 `${Math.ceil((new Date(event.end_datetime).getTime() - new Date(event.start_datetime).getTime()) / (1000 * 60 * 60))}h duration` :
 'Duration not set'
 }
 </span>
 <button
 onClick={() => softDeleteEvent(event.id)}
 className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-xs"
 >
 Delete
 </button>
 </div>
 </div>
 );
 })}
 </div>
 )}

 {/* Create Event Modal */}
 {isCreatingEvent && (
 <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
 <div className="bg-card dark:bg-card rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
 <h3 className="text-lg font-semibold text-foreground mb-4">Create New Event</h3>
 <EventForm
 onSuccess={handleEventSubmit}
 onCancel={() => setIsCreatingEvent(false)}
 />
 </div>
 </div>
 )}

 <ConfirmDialog
 open={confirmBulkDelete}
 title={`Delete ${selectedIds.size} event${selectedIds.size === 1 ? '' : 's'}`}
 description="These events will be removed permanently. This action cannot be undone."
 destructive
 confirmLabel={`Delete ${selectedIds.size}`}
 busy={isDeleting}
 onConfirm={performBulkDelete}
 onCancel={() => !isDeleting && setConfirmBulkDelete(false)}
 />
 
 </div>
 );
};

export default withAuth(EventsPage);
