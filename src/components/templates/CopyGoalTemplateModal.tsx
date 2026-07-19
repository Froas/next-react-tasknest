'use client';

import React, { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { templatesApi, type TemplateItem } from '@/lib/api';
import type { GoalItem } from '@/lib/types';
import { parseTemplateTags } from '@/lib/templateDraft';

type Props = {
 open: boolean;
 goals: GoalItem[];
 loadingGoals: boolean;
 onClose: () => void;
 onCreated: (template: TemplateItem) => void;
};

const fieldClass = 'w-full px-3 py-2 border border-border bg-card text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring';

export const CopyGoalTemplateModal: React.FC<Props> = ({ open, goals, loadingGoals, onClose, onCreated }) => {
 const [goalId, setGoalId] = useState('');
 const [title, setTitle] = useState('');
 const [tags, setTags] = useState('');
 const [saving, setSaving] = useState(false);
 const [error, setError] = useState<string | null>(null);

 useEffect(() => {
 if (!open) {
 setGoalId('');
 setTitle('');
 setTags('');
 setError(null);
 }
 }, [open]);

 const selectedGoal = goals.find((goal) => goal.id === goalId);

 const submit = async (event: React.FormEvent) => {
 event.preventDefault();
 if (!goalId) {
 setError('Choose a goal to copy');
 return;
 }
 setSaving(true);
 setError(null);
 try {
 const template = await templatesApi.createFromGoal({
 goal_id: goalId,
 ...(title.trim() ? { title: title.trim() } : {}),
 ...(tags.trim() ? { tags: parseTemplateTags(tags) } : {}),
 });
 onCreated(template);
 onClose();
 } catch (err) {
 setError(err instanceof Error ? err.message : 'Failed to copy goal');
 } finally {
 setSaving(false);
 }
 };

 return (
 <Modal open={open} onClose={onClose} title="Save goal as template" maxWidth="lg">
 <form onSubmit={submit} className="space-y-4">
 <p className="text-sm text-muted-foreground">
 The full structure is copied: milestones, tasks, subtasks, routines, metrics, and relative dates. Your original goal stays unchanged.
 </p>
 {error && <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-600">{error}</div>}
 <div>
 <label className="mb-1 block text-sm font-medium">Goal</label>
 <select
 className={fieldClass}
 value={goalId}
 onChange={(event) => {
 const nextGoal = goals.find((goal) => goal.id === event.target.value);
 setGoalId(event.target.value);
 setTitle(nextGoal ? `${nextGoal.title} template` : '');
 }}
 disabled={loadingGoals}
 >
 <option value="">{loadingGoals ? 'Loading goals…' : 'Choose a goal'}</option>
 {goals.map((goal) => <option key={goal.id} value={goal.id}>{goal.title}</option>)}
 </select>
 </div>
 {goals.length === 0 && !loadingGoals && (
 <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
 Create a goal first, then you can turn it into a reusable template here.
 </div>
 )}
 <div>
 <label className="mb-1 block text-sm font-medium">Template name</label>
 <input
 className={fieldClass}
 value={title}
 onChange={(event) => setTitle(event.target.value)}
 placeholder={selectedGoal ? `${selectedGoal.title} template` : 'Template name'}
 disabled={!goalId}
 />
 </div>
 <div>
 <label className="mb-1 block text-sm font-medium">Tags (optional)</label>
 <input
 className={fieldClass}
 value={tags}
 onChange={(event) => setTags(event.target.value)}
 placeholder="work, fitness, planning"
 disabled={!goalId}
 />
 </div>
 <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
 <button type="button" className="btn btn-secondary justify-center" onClick={onClose}>Cancel</button>
 <button type="submit" className="btn btn-primary justify-center" disabled={saving || !goalId}>
 {saving ? 'Copying…' : 'Save as template'}
 </button>
 </div>
 </form>
 </Modal>
 );
};
