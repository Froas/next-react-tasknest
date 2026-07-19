'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { templatesApi, type TemplateItem } from '@/lib/api';
import {
 emptyDraftTask,
 emptyTemplateDraft,
 parseTemplateTags,
 templateDraftToBlueprint,
 type TemplateDraft,
 type TemplateDraftTask,
} from '@/lib/templateDraft';

type Props = {
 open: boolean;
 onClose: () => void;
 onCreated: (template: TemplateItem) => void;
};

const fieldClass = 'w-full px-3 py-2 border border-border bg-card text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring';

const TaskFields: React.FC<{
 task: TemplateDraftTask;
 onChange: (next: TemplateDraftTask) => void;
 onRemove: () => void;
}> = ({ task, onChange, onRemove }) => (
 <div className="rounded-lg border border-border p-3 space-y-3">
 <div className="flex items-start gap-2">
 <input
 className={fieldClass}
 value={task.title}
 onChange={(event) => onChange({ ...task, title: event.target.value })}
 placeholder="Task title"
 aria-label="Task title"
 />
 <button type="button" className="btn btn-secondary px-2" onClick={onRemove} aria-label="Remove task">
 <Trash2 className="h-4 w-4" />
 </button>
 </div>
 <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
 <select
 className={fieldClass}
 value={task.kind}
 onChange={(event) => onChange({ ...task, kind: event.target.value as TemplateDraftTask['kind'] })}
 aria-label="Task type"
 >
 <option value="project">Project</option>
 <option value="routine">Routine</option>
 <option value="challenge">Challenge</option>
 </select>
 <select
 className={fieldClass}
 value={task.priority}
 onChange={(event) => onChange({ ...task, priority: event.target.value as TemplateDraftTask['priority'] })}
 aria-label="Task priority"
 >
 <option value="low">Low priority</option>
 <option value="medium">Medium priority</option>
 <option value="high">High priority</option>
 </select>
 </div>
 <textarea
 className={fieldClass}
 value={task.description}
 onChange={(event) => onChange({ ...task, description: event.target.value })}
 placeholder="Description (optional)"
 rows={2}
 aria-label="Task description"
 />
 {(task.kind === 'project' || task.kind === 'challenge') && <div>
 <label className="mb-1 block text-xs font-medium text-muted-foreground">Subtasks</label>
 <textarea
 className={fieldClass}
 value={task.subtaskTitles}
 onChange={(event) => onChange({ ...task, subtaskTitles: event.target.value })}
 placeholder="One per line or separated by commas"
 rows={2}
 />
 </div>}
 {(task.kind === 'routine' || task.kind === 'challenge') && <div>
 <label className="mb-1 block text-xs font-medium text-muted-foreground">Daily routine items</label>
 <textarea
 className={fieldClass}
 value={task.todoTitles}
 onChange={(event) => onChange({ ...task, todoTitles: event.target.value })}
 placeholder="One per line or separated by commas"
 rows={2}
 />
 </div>}
 </div>
);

export const TemplateBuilderModal: React.FC<Props> = ({ open, onClose, onCreated }) => {
 const [draft, setDraft] = useState<TemplateDraft>(() => emptyTemplateDraft());
 const [saving, setSaving] = useState(false);
 const [error, setError] = useState<string | null>(null);

 useEffect(() => {
 if (!open) {
 setDraft(emptyTemplateDraft());
 setError(null);
 }
 }, [open]);

 const addGoalTask = () => setDraft((current) => ({
 ...current,
 goalTasks: [...current.goalTasks, emptyDraftTask()],
 }));

 const addMilestone = () => setDraft((current) => ({
 ...current,
 milestones: [...current.milestones, {
 title: '',
 description: '',
 dueDateOffsetDays: Math.min(current.durationDays, Math.max(1, (current.milestones.length + 1) * 14)),
 tasks: [],
 }],
 }));

 const submit = async (event: React.FormEvent) => {
 event.preventDefault();
 if (!draft.title.trim()) {
 setError('Template name is required');
 return;
 }
 setSaving(true);
 setError(null);
 try {
 const template = await templatesApi.create({
 title: draft.title.trim(),
 description: draft.description.trim(),
 tags: parseTemplateTags(draft.tags),
 blueprint: templateDraftToBlueprint(draft),
 });
 onCreated(template);
 onClose();
 } catch (err) {
 setError(err instanceof Error ? err.message : 'Failed to create template');
 } finally {
 setSaving(false);
 }
 };

 return (
 <Modal open={open} onClose={onClose} title="Create a template" maxWidth="2xl">
 <form onSubmit={submit} className="space-y-5">
 {error && <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-600">{error}</div>}

 <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_120px]">
 <div>
 <label className="mb-1 block text-sm font-medium">Name</label>
 <input
 autoFocus
 className={fieldClass}
 value={draft.title}
 onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
 placeholder="e.g. Product launch"
 />
 </div>
 <div>
 <label className="mb-1 block text-sm font-medium">Duration</label>
 <div className="relative">
 <input
 className={`${fieldClass} pr-12`}
 type="number"
 min={1}
 max={3650}
 value={draft.durationDays}
 onChange={(event) => setDraft((current) => ({ ...current, durationDays: Number(event.target.value) }))}
 />
 <span className="pointer-events-none absolute right-3 top-2.5 text-xs text-muted-foreground">days</span>
 </div>
 </div>
 </div>
 <div>
 <label className="mb-1 block text-sm font-medium">Description</label>
 <textarea
 className={fieldClass}
 value={draft.description}
 onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
 rows={3}
 placeholder="What this template helps accomplish"
 />
 </div>
 <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
 <div>
 <label className="mb-1 block text-sm font-medium">Tags</label>
 <input
 className={fieldClass}
 value={draft.tags}
 onChange={(event) => setDraft((current) => ({ ...current, tags: event.target.value }))}
 placeholder="work, focus, launch"
 />
 </div>
 <div>
 <label className="mb-1 block text-sm font-medium">Default priority</label>
 <select
 className={fieldClass}
 value={draft.priority}
 onChange={(event) => setDraft((current) => ({ ...current, priority: event.target.value as TemplateDraft['priority'] }))}
 >
 <option value="low">Low</option>
 <option value="medium">Medium</option>
 <option value="high">High</option>
 </select>
 </div>
 </div>

 <section className="space-y-3">
 <div className="flex items-center justify-between gap-3">
 <div>
 <h4 className="text-sm font-semibold">Always-on tasks</h4>
 <p className="text-xs text-muted-foreground">Goal-level projects, routines, or challenges.</p>
 </div>
 <button type="button" className="btn btn-secondary" onClick={addGoalTask}>
 <Plus className="h-4 w-4" /> Task
 </button>
 </div>
 {draft.goalTasks.map((task, index) => (
 <TaskFields
 key={`goal-task-${index}`}
 task={task}
 onChange={(next) => setDraft((current) => ({
 ...current,
 goalTasks: current.goalTasks.map((item, itemIndex) => itemIndex === index ? next : item),
 }))}
 onRemove={() => setDraft((current) => ({
 ...current,
 goalTasks: current.goalTasks.filter((_, itemIndex) => itemIndex !== index),
 }))}
 />
 ))}
 </section>

 <section className="space-y-3">
 <div className="flex items-center justify-between gap-3">
 <div>
 <h4 className="text-sm font-semibold">Milestones</h4>
 <p className="text-xs text-muted-foreground">Relative deadlines will start when the template is used.</p>
 </div>
 <button type="button" className="btn btn-secondary" onClick={addMilestone}>
 <Plus className="h-4 w-4" /> Milestone
 </button>
 </div>
 {draft.milestones.map((milestone, milestoneIndex) => (
 <div key={`milestone-${milestoneIndex}`} className="rounded-xl border border-border bg-muted/20 p-3 space-y-3">
 <div className="flex items-start gap-2">
 <input
 className={fieldClass}
 value={milestone.title}
 onChange={(event) => setDraft((current) => ({
 ...current,
 milestones: current.milestones.map((item, index) => index === milestoneIndex ? { ...item, title: event.target.value } : item),
 }))}
 placeholder={`Milestone ${milestoneIndex + 1}`}
 aria-label={`Milestone ${milestoneIndex + 1} title`}
 />
 <input
 className={`${fieldClass} w-28`}
 type="number"
 min={1}
 value={milestone.dueDateOffsetDays}
 onChange={(event) => setDraft((current) => ({
 ...current,
 milestones: current.milestones.map((item, index) => index === milestoneIndex ? { ...item, dueDateOffsetDays: Number(event.target.value) } : item),
 }))}
 aria-label="Due after days"
 title="Due after days"
 />
 <button
 type="button"
 className="btn btn-secondary px-2"
 onClick={() => setDraft((current) => ({
 ...current,
 milestones: current.milestones.filter((_, index) => index !== milestoneIndex),
 }))}
 aria-label="Remove milestone"
 >
 <Trash2 className="h-4 w-4" />
 </button>
 </div>
 <textarea
 className={fieldClass}
 value={milestone.description}
 onChange={(event) => setDraft((current) => ({
 ...current,
 milestones: current.milestones.map((item, index) => index === milestoneIndex ? { ...item, description: event.target.value } : item),
 }))}
 placeholder="Milestone description (optional)"
 rows={2}
 />
 {milestone.tasks.map((task, taskIndex) => (
 <TaskFields
 key={`milestone-${milestoneIndex}-task-${taskIndex}`}
 task={task}
 onChange={(next) => setDraft((current) => ({
 ...current,
 milestones: current.milestones.map((item, index) => index === milestoneIndex
 ? { ...item, tasks: item.tasks.map((taskItem, indexOfTask) => indexOfTask === taskIndex ? next : taskItem) }
 : item),
 }))}
 onRemove={() => setDraft((current) => ({
 ...current,
 milestones: current.milestones.map((item, index) => index === milestoneIndex
 ? { ...item, tasks: item.tasks.filter((_, indexOfTask) => indexOfTask !== taskIndex) }
 : item),
 }))}
 />
 ))}
 <button
 type="button"
 className="btn btn-secondary w-full justify-center"
 onClick={() => setDraft((current) => ({
 ...current,
 milestones: current.milestones.map((item, index) => index === milestoneIndex
 ? { ...item, tasks: [...item.tasks, emptyDraftTask()] }
 : item),
 }))}
 >
 <Plus className="h-4 w-4" /> Add task to milestone
 </button>
 </div>
 ))}
 </section>

 <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
 <button type="button" className="btn btn-secondary justify-center" onClick={onClose}>Cancel</button>
 <button type="submit" className="btn btn-primary justify-center" disabled={saving}>
 {saving ? 'Saving…' : 'Save template'}
 </button>
 </div>
 </form>
 </Modal>
 );
};
