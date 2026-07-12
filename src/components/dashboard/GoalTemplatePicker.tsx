'use client';

import React, { useState } from 'react';
import {
 GOAL_TEMPLATES,
 GoalTemplate,
 countTemplateMetrics,
 countTemplateSubtasks,
 countTemplateTasks,
 countTemplateTodos,
} from '@/lib/goalTemplates';
import { templatesApi } from '@/lib/api';
import { useStore } from '@/store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { toast } from '@/store/useToast';
import { Modal } from '@/components/ui/Modal';
import { Sparkles } from 'lucide-react';

interface GoalTemplatePickerProps {
 open: boolean;
 onClose: () => void;
}

// Modal that lets the user materialise a curated template into a real goal
// + nested milestones + tasks. Runs the API calls sequentially so milestones
// know their goal_id and tasks know their milestone_id.
export const GoalTemplatePicker: React.FC<GoalTemplatePickerProps> = ({ open, onClose }) => {
 const [busyId, setBusyId] = useState<string | null>(null);
 const { addGoal } = useStore(
 useShallow((s) => ({ addGoal: s.addGoal }))
 );

 const apply = async (template: GoalTemplate) => {
 setBusyId(template.id);
 try {
 const goal = await templatesApi.instantiateBlueprint({
 title: template.title,
 description: template.description,
 emoji: template.emoji,
 tags: template.tags,
 blueprint: template.blueprint,
 });
 addGoal({ ...goal, milestones: [] });
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
 className="flex h-full flex-col border border-border dark:border-border rounded-lg p-4 hover:shadow-md transition-shadow"
 >
 <div className="flex items-start justify-between mb-2">
 <div>
 <h4 className="font-semibold text-foreground">
 <span className="mr-2">{t.emoji}</span>
 {t.title}
 </h4>
 <p className="text-xs text-muted-foreground dark:text-muted-foreground">
 {t.blueprint.milestones.length} milestones · {countTemplateTasks(t)} tasks · {countTemplateTodos(t)} routines
 </p>
 </div>
 </div>
 <p className="text-sm text-foreground dark:text-muted-foreground/60 mb-3 flex-1">{t.description}</p>
 <p className="text-xs text-muted-foreground dark:text-muted-foreground mb-3">
 {countTemplateSubtasks(t)} subtasks · {countTemplateMetrics(t)} metrics · ~{Math.round(t.durationDays / 7)} weeks
 </p>
 <button
 onClick={() => apply(t)}
 disabled={busyId !== null}
 className="btn btn-primary mt-auto w-full justify-center disabled:opacity-50"
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
