'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { withAuth } from '@/hoc/withAuth';
import { templatesApi, type TemplateItem } from '@/lib/api';
import {
 GOAL_TEMPLATES,
 countTemplateMetrics,
 countTemplateSubtasks,
 countTemplateTasks,
 countTemplateTodos,
 type GoalTemplate,
} from '@/lib/goalTemplates';
import { useStore } from '@/store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { toast } from '@/store/useToast';
import {
 Activity,
 BookOpen,
 Brain,
 Briefcase,
 Compass,
 Dumbbell,
 FileText,
 FolderArchive,
 Heart,
 Home,
 Languages,
 LayoutTemplate,
 MessageCircle,
 Moon,
 Network,
 PenLine,
 Radio,
 Rocket,
 Scale,
 Users,
 Utensils,
 Wallet,
 type LucideIcon,
} from 'lucide-react';

const TAG_PILL_KNOWN = ['brand', 'run', 'read', 'work', 'life', 'health', 'daily', 'metrics', 'sleep', 'product', 'radar', 'notes'];

const TEMPLATE_ICON_BY_ID: Record<string, LucideIcon> = {
 'weight-loss-system': Scale,
 'recovery-os': Moon,
 'tracker-mvp': Compass,
 'professional-radar': Radio,
 'deep-work-system': Brain,
 'japanese-n3-path': Languages,
 'english-fluency-maintenance': MessageCircle,
 'run-5k': Activity,
 'strength-foundation': Dumbbell,
 'personal-finance-reset': Wallet,
 'read-12-books': BookOpen,
 'side-project-launch': Rocket,
 'home-reset': Home,
 'meal-prep-system': Utensils,
 'mindfulness-calm': Heart,
 'portfolio-career-switch': Briefcase,
 'knowledge-base-obsidian': Network,
 'digital-declutter': FolderArchive,
 'social-reconnection': Users,
 'writing-habit': PenLine,
};

const TEMPLATE_ICON_BY_TAG: Record<string, LucideIcon> = {
 health: Heart,
 sleep: Moon,
 work: Briefcase,
 product: Rocket,
 radar: Radio,
 notes: FileText,
 language: Languages,
 fitness: Activity,
 finance: Wallet,
 reading: BookOpen,
 home: Home,
 food: Utensils,
 social: Users,
 writing: PenLine,
};

const TemplateIcon: React.FC<{ id: string; tags?: string[] | null }> = ({ id, tags }) => {
 const Icon = TEMPLATE_ICON_BY_ID[id]
 ?? (tags ?? []).map((tag) => TEMPLATE_ICON_BY_TAG[tag]).find(Boolean)
 ?? LayoutTemplate;
 return (
 <span
 className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border"
 style={{
 border: 'var(--tn-line)',
 background: 'var(--tn-hover)',
 color: 'var(--tn-accent)',
 }}
 aria-hidden="true"
 >
 <Icon className="h-5 w-5" strokeWidth={1.8} />
 </span>
 );
};

const TemplatesPage: React.FC = () => {
 const router = useRouter();
 const [templates, setTemplates] = useState<TemplateItem[]>([]);
 const [loading, setLoading] = useState(true);
 const [instantiatingId, setInstantiatingId] = useState<string | null>(null);
 const [error, setError] = useState<string | null>(null);
 const { addGoal } = useStore(
 useShallow((s) => ({ addGoal: s.addGoal }))
 );

 useEffect(() => {
 let cancelled = false;
 (async () => {
 try {
 const data = await templatesApi.getAll();
 if (!cancelled) setTemplates(data);
 } catch (e) {
 if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load templates');
 } finally {
 if (!cancelled) setLoading(false);
 }
 })();
 return () => {
 cancelled = true;
 };
 }, []);

 async function handleUseBackend(id: string) {
 setInstantiatingId(id);
 setError(null);
 try {
 const goal = await templatesApi.instantiate(id);
 router.push(`/goal/${goal.id}`);
 } catch (e) {
 setError(e instanceof Error ? e.message : 'Failed to use template');
 } finally {
 setInstantiatingId(null);
 }
 }

 async function handleUseStarter(template: GoalTemplate) {
 const busyKey = `starter:${template.id}`;
 setInstantiatingId(busyKey);
 setError(null);
 try {
 const goal = await templatesApi.instantiateBlueprint({
 title: template.title,
 description: template.description,
 tags: template.tags,
 blueprint: template.blueprint,
 });
 addGoal({ ...goal, milestones: [] });
 toast.success(`"${template.title}" added to your goals`);
 router.push(`/goal/${goal.id}`);
 } catch (e) {
 console.error('Failed to use starter template:', e);
 setError(e instanceof Error ? e.message : 'Failed to use starter template');
 } finally {
 setInstantiatingId(null);
 }
 }

 const totalTemplates = GOAL_TEMPLATES.length + templates.length;

 return (
 <div className="page">
 <div className="page-head">
 <div className="page-eyebrow">
 Templates ·{' '}
 {loading
 ? 'loading…'
 : `${totalTemplates} starter plan${totalTemplates === 1 ? '' : 's'}`}
 </div>
 <h1 className="page-title">Start from a template</h1>
 <p className="page-lede">
 Each template is a complete goal with milestones and tasks. Pick
 one — you can change everything later.
 </p>
 </div>

 {error && (
 <div
 style={{
 padding: '10px 14px',
 fontSize: 13,
 marginBottom: 16,
 background: 'var(--tn-pr-high-bg)',
 color: 'var(--tn-pr-high-fg)',
 borderRadius: 8,
 }}
 >
 {error}
 </div>
 )}

 {!loading && totalTemplates === 0 && (
 <div
 className="card"
 style={{
 textAlign: 'center',
 color: 'var(--tn-fg-muted)',
 padding: 40,
 }}
 >
 <h3 style={{ fontSize: 16, marginBottom: 8, color: 'var(--tn-fg)' }}>
 No templates yet
 </h3>
 <p style={{ fontSize: 13 }}>
 Templates appear here once the backend is seeded or you create
 your own via the API.
 </p>
 </div>
 )}

 <div className="section">
 <div
 style={{
 display: 'grid',
 gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
 gap: 14,
 }}
 >
 {GOAL_TEMPLATES.map((t) => {
 const busyKey = `starter:${t.id}`;
 return (
 <div
 key={`starter-${t.id}`}
 className="card"
 style={{
 padding: 18,
 display: 'flex',
 flexDirection: 'column',
 gap: 10,
 minHeight: 250,
 }}
 >
 <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
 <TemplateIcon id={t.id} tags={t.tags} />
 <h3 style={{ fontSize: 15, fontWeight: 600 }}>{t.title}</h3>
 </div>
 <p
 style={{
 fontSize: 13,
 color: 'var(--tn-fg-muted)',
 lineHeight: 1.5,
 flex: 1,
 }}
 >
 {t.description}
 </p>
 <div style={{ fontSize: 12, color: 'var(--tn-fg-muted)' }}>
 {t.blueprint.milestones.length} milestones · {countTemplateTasks(t)} tasks · {countTemplateTodos(t)} routines
 </div>
 <div style={{ fontSize: 12, color: 'var(--tn-fg-muted)' }}>
 {countTemplateSubtasks(t)} subtasks · {countTemplateMetrics(t)} metrics · ~{Math.round(t.durationDays / 7)} weeks
 </div>
 <button
 className="btn btn-primary"
 style={{ marginTop: 'auto', justifyContent: 'center', width: '100%' }}
 onClick={() => handleUseStarter(t)}
 disabled={instantiatingId !== null}
 >
 {instantiatingId === busyKey ? 'Creating goal…' : 'Use this template'}
 </button>
 </div>
 );
 })}
 {templates.map((t) => {
 const blueprintMilestones = t.blueprint?.milestones?.length ?? 0;
 const blueprintGoalTasks = t.blueprint?.goal_tasks?.length ?? 0;
 const blueprintTasks = blueprintGoalTasks + (
 t.blueprint?.milestones?.reduce((a, m) => a + (m.tasks?.length ?? 0), 0) ?? 0
 );
 const blueprintTodos =
 (t.blueprint?.goal_tasks?.reduce((a, task) => a + (task.todos?.length ?? 0), 0) ?? 0) +
 (t.blueprint?.milestones?.reduce(
 (a, milestone) => a + (milestone.tasks?.reduce((taskSum, task) => taskSum + (task.todos?.length ?? 0), 0) ?? 0),
 0,
 ) ?? 0);
 const blueprintSubtasks =
 t.blueprint?.milestones?.reduce(
 (a, milestone) => a + (milestone.tasks?.reduce((taskSum, task) => taskSum + (task.subtasks?.length ?? 0), 0) ?? 0),
 0,
 ) ?? 0;
 const blueprintMetrics =
 (t.blueprint?.metrics?.length ?? 0) +
 (t.blueprint?.goal_tasks?.reduce((a, task) => a + (task.metrics?.length ?? 0), 0) ?? 0) +
 (t.blueprint?.milestones?.reduce(
 (a, milestone) => a + (milestone.tasks?.reduce((taskSum, task) => taskSum + (task.metrics?.length ?? 0), 0) ?? 0),
 0,
 ) ?? 0);
 return (
 <div
 key={t.id}
 className="card"
 style={{
 padding: 18,
 display: 'flex',
 flexDirection: 'column',
 gap: 10,
 minHeight: 250,
 }}
 >
 <div
 style={{ display: 'flex', alignItems: 'center', gap: 10 }}
 >
 <TemplateIcon id={t.id} tags={t.tags} />
 <h3 style={{ fontSize: 15, fontWeight: 600 }}>{t.title}</h3>
 </div>
 {t.description && (
 <p
 style={{
 fontSize: 13,
 color: 'var(--tn-fg-muted)',
 lineHeight: 1.5,
 flex: 1,
 }}
 >
 {t.description}
 </p>
 )}
 <div
 style={{ fontSize: 12, color: 'var(--tn-fg-muted)' }}
 >
 {blueprintMilestones} milestones · {blueprintTasks} tasks · {blueprintTodos} routines
 </div>
 <div
 style={{ fontSize: 12, color: 'var(--tn-fg-muted)' }}
 >
 {blueprintSubtasks} subtasks · {blueprintMetrics} metrics
 </div>
 {t.tags && t.tags.length > 0 && (
 <div
 style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}
 >
 {t.tags.map((tg) => (
 <span
 key={tg}
 className={
 TAG_PILL_KNOWN.includes(tg)
 ? `pill tag-${tg}`
 : 'pill'
 }
 >
 {tg}
 </span>
 ))}
 </div>
 )}
 <button
 className="btn btn-primary"
 style={{ marginTop: 'auto', justifyContent: 'center', width: '100%' }}
 onClick={() => handleUseBackend(t.id)}
 disabled={instantiatingId !== null}
 >
 {instantiatingId === t.id
 ? 'Creating goal…'
 : 'Use this template'}
 </button>
 </div>
 );
 })}
 </div>
 </div>
 </div>
 );
};

export default withAuth(TemplatesPage);
