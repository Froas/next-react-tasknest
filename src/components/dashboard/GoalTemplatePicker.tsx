'use client';

import React, { useState } from 'react';
import { GOAL_TEMPLATES, GoalTemplate } from '@/lib/goalTemplates';
import { goalsApi, milestonesApi, tasksApi } from '@/lib/api';
import { useStore } from '@/store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { StatusType, PriorityType } from '@/lib/types';
import { toast } from '@/store/useToast';
import { Modal } from '@/components/ui/Modal';
import { Sparkles } from 'lucide-react';

interface GoalTemplatePickerProps {
 open: boolean;
 onClose: () => void;
}

const daysFromNow = (days: number) => {
 const d = new Date();
 d.setDate(d.getDate() + days);
 return d.toISOString();
};

// Modal that lets the user materialise a curated template into a real goal
// + nested milestones + tasks. Runs the API calls sequentially so milestones
// know their goal_id and tasks know their milestone_id.
export const GoalTemplatePicker: React.FC<GoalTemplatePickerProps> = ({ open, onClose }) => {
 const [busyId, setBusyId] = useState<string | null>(null);
 const { addGoal, updateGoal } = useStore(
 useShallow((s) => ({ addGoal: s.addGoal, updateGoal: s.updateGoal }))
 );

 const apply = async (template: GoalTemplate) => {
 setBusyId(template.id);
 try {
 const goal = await goalsApi.create({
 title: template.title,
 description: template.description,
 status: StatusType.OUTSTANDING,
 priority: template.priority,
 start_datetime: new Date().toISOString(),
 end_datetime: daysFromNow(template.durationDays),
 });
 addGoal({ ...goal, milestones: [] });

 const createdMilestones = [];
 for (let i = 0; i < template.milestones.length; i++) {
 const tpl = template.milestones[i];
 const m = await milestonesApi.create({
 title: tpl.title,
 description: tpl.description,
 status: StatusType.OUTSTANDING,
 priority: PriorityType.MEDIUM,
 goal_id: goal.id,
 position: i,
 due_date: daysFromNow(Math.round((template.durationDays * (i + 1)) / template.milestones.length)),
 });
 // Sequentially create tasks for this milestone.
 const tasks = [];
 for (const taskTitle of tpl.taskTitles) {
 try {
 const t = await tasksApi.create({
 title: taskTitle,
 description: '',
 status: StatusType.OUTSTANDING,
 priority: PriorityType.MEDIUM,
 milestone_id: m.id,
 todos: [],
 subtasks: [],
 });
 tasks.push(t);
 } catch (err) {
 console.error(`Failed to create task '${taskTitle}':`, err);
 }
 }
 createdMilestones.push({ ...m, tasks });
 }
 updateGoal({ ...goal, milestones: createdMilestones });
 toast.success(`"${template.title}" added to your goals`);
 onClose();
 } catch (err) {
 console.error('Failed to apply template:', err);
 toast.error('Failed to apply template');
 } finally {
 setBusyId(null);
 }
 };

 return (
 <Modal open={open} title="Pick a starter template" onClose={onClose} maxWidth="xl">
 <p className="text-sm text-foreground dark:text-muted-foreground/60 mb-4">
 Materialise one of these curated goals — comes with milestones and starter tasks. You can edit anything afterwards.
 </p>
 <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 {GOAL_TEMPLATES.map((t) => (
 <li
 key={t.id}
 className="border border-border dark:border-border rounded-lg p-4 hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
 >
 <div className="flex items-start justify-between mb-2">
 <div>
 <h4 className="font-semibold text-foreground">
 <span className="mr-2">{t.emoji}</span>
 {t.title}
 </h4>
 <p className="text-xs text-muted-foreground dark:text-muted-foreground">
 {t.milestones.length} milestones · ~{Math.round(t.durationDays / 7)} weeks
 </p>
 </div>
 </div>
 <p className="text-sm text-foreground dark:text-muted-foreground/60 mb-3">{t.description}</p>
 <button
 onClick={() => apply(t)}
 disabled={busyId !== null}
 className="w-full px-3 py-2 text-sm font-medium text-white bg-card dark:bg-card rounded-lg hover:bg-card dark:hover:bg-muted disabled:opacity-50 flex items-center justify-center space-x-2"
 >
 <Sparkles className="w-4 h-4" />
 <span>{busyId === t.id ? 'Setting up...' : 'Use template'}</span>
 </button>
 </li>
 ))}
 </ul>
 </Modal>
 );
};
