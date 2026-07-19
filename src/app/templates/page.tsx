'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useShallow } from 'zustand/react/shallow';
import {
 Activity,
 BookOpen,
 Brain,
 Briefcase,
 Compass,
 Copy,
 Download,
 Dumbbell,
 FileText,
 FolderArchive,
 Heart,
 Home,
 Languages,
 LayoutTemplate,
 LockKeyhole,
 MessageCircle,
 Moon,
 Network,
 PenLine,
 Plus,
 Radio,
 Rocket,
 Scale,
 Share2,
 Sparkles,
 Trash2,
 Users,
 Utensils,
 Wallet,
 type LucideIcon,
} from 'lucide-react';
import { withAuth } from '@/hoc/withAuth';
import { templatesApi, type TemplateBlueprint, type TemplateItem } from '@/lib/api';
import {
 GOAL_TEMPLATES,
 countTemplateMetrics,
 countTemplateSubtasks,
 countTemplateTasks,
 countTemplateTodos,
 type GoalTemplate,
} from '@/lib/goalTemplates';
import { TemplateBuilderModal } from '@/components/templates/TemplateBuilderModal';
import { CopyGoalTemplateModal } from '@/components/templates/CopyGoalTemplateModal';
import { ImportTemplateModal } from '@/components/templates/ImportTemplateModal';
import { ShareTemplateModal } from '@/components/templates/ShareTemplateModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import { useStore } from '@/store/useStore';
import { toast } from '@/store/useToast';

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

const TemplateIcon: React.FC<{ id: string; tags?: string[] | null; personal?: boolean }> = ({ id, tags, personal }) => {
 const Icon = personal
 ? Sparkles
 : TEMPLATE_ICON_BY_ID[id] ?? (tags ?? []).map((tag) => TEMPLATE_ICON_BY_TAG[tag]).find(Boolean) ?? LayoutTemplate;
 return (
 <span
 className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border"
 style={{ border: 'var(--tn-line)', background: 'var(--tn-hover)', color: 'var(--tn-accent)' }}
 aria-hidden="true"
 >
 <Icon className="h-5 w-5" strokeWidth={1.8} />
 </span>
 );
};

type BlueprintStats = { milestones: number; tasks: number; todos: number; subtasks: number; metrics: number };

const getBlueprintStats = (blueprint?: TemplateBlueprint | null): BlueprintStats => {
 const goalTasks = blueprint?.goal_tasks ?? [];
 const milestones = blueprint?.milestones ?? [];
 const milestoneTasks = milestones.flatMap((milestone) => milestone.tasks ?? []);
 const tasks = [...goalTasks, ...milestoneTasks];
 return {
 milestones: milestones.length,
 tasks: tasks.length,
 todos: tasks.reduce((sum, task) => sum + (task.todos?.length ?? 0), 0),
 subtasks: tasks.reduce((sum, task) => sum + (task.subtasks?.length ?? 0), 0),
 metrics: (blueprint?.metrics?.length ?? 0) + tasks.reduce((sum, task) => sum + (task.metrics?.length ?? 0), 0),
 };
};

const StatLine: React.FC<{ stats: BlueprintStats; durationDays?: number }> = ({ stats, durationDays }) => (
 <div className="space-y-1 text-xs text-muted-foreground">
 <div>{stats.milestones} milestones · {stats.tasks} tasks · {stats.todos} routines</div>
 <div>{stats.subtasks} subtasks · {stats.metrics} metrics{durationDays ? ` · ~${Math.max(1, Math.round(durationDays / 7))} weeks` : ''}</div>
 </div>
);

const TemplatesPage: React.FC = () => {
 useDocumentTitle('Templates');
 const router = useRouter();
 const [templates, setTemplates] = useState<TemplateItem[]>([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [instantiatingId, setInstantiatingId] = useState<string | null>(null);
 const [builderOpen, setBuilderOpen] = useState(false);
 const [copyOpen, setCopyOpen] = useState(false);
 const [importOpen, setImportOpen] = useState(false);
 const [shareTarget, setShareTarget] = useState<TemplateItem | null>(null);
 const [deleteTarget, setDeleteTarget] = useState<TemplateItem | null>(null);
 const [deleting, setDeleting] = useState(false);
 const { addGoal, goals, fetchGoals, isLoadingGoals } = useStore(useShallow((state) => ({
 addGoal: state.addGoal,
 goals: state.goals,
 fetchGoals: state.fetchGoals,
 isLoadingGoals: state.isLoadingGoals,
 })));

 useEffect(() => {
 let cancelled = false;
 (async () => {
 try {
 const data = await templatesApi.getAll();
 if (!cancelled) setTemplates(data);
 } catch (err) {
 if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load templates');
 } finally {
 if (!cancelled) setLoading(false);
 }
 })();
 return () => { cancelled = true; };
 }, []);

 const personalTemplates = useMemo(() => templates.filter((template) => template.user_id !== null), [templates]);
 const systemTemplates = useMemo(() => templates.filter((template) => template.user_id === null), [templates]);

 const registerTemplate = (template: TemplateItem) => {
 setTemplates((current) => [template, ...current.filter((item) => item.id !== template.id)]);
 toast.success(`“${template.title}” saved to your templates`);
 };

 const updateTemplate = (template: TemplateItem) => {
 setTemplates((current) => current.map((item) => item.id === template.id ? template : item));
 setShareTarget((current) => current?.id === template.id ? template : current);
 };

 const openCopy = () => {
 setCopyOpen(true);
 void fetchGoals();
 };

 const useBackendTemplate = async (template: TemplateItem) => {
 setInstantiatingId(template.id);
 setError(null);
 try {
 const goal = await templatesApi.instantiate(template.id);
 addGoal({ ...goal, milestones: goal.milestones ?? [] });
 toast.success(`Goal created from “${template.title}”`);
 router.push(`/goal/${goal.id}`);
 } catch (err) {
 const message = err instanceof Error ? err.message : 'Failed to use template';
 setError(message);
 toast.error(message);
 } finally {
 setInstantiatingId(null);
 }
 };

 const useStarterTemplate = async (template: GoalTemplate) => {
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
 toast.success(`Goal created from “${template.title}”`);
 router.push(`/goal/${goal.id}`);
 } catch (err) {
 const message = err instanceof Error ? err.message : 'Failed to use starter template';
 setError(message);
 toast.error(message);
 } finally {
 setInstantiatingId(null);
 }
 };

 const deleteTemplate = async () => {
 if (!deleteTarget) return;
 setDeleting(true);
 try {
 await templatesApi.delete(deleteTarget.id);
 setTemplates((current) => current.filter((template) => template.id !== deleteTarget.id));
 toast.success('Template deleted');
 setDeleteTarget(null);
 } catch (err) {
 toast.error(err instanceof Error ? err.message : 'Failed to delete template');
 } finally {
 setDeleting(false);
 }
 };

 return (
 <div className="page">
 <div className="page-head page-head-row">
 <div>
 <div className="page-eyebrow">Reusable systems · {personalTemplates.length} yours</div>
 <h1 className="page-title">Templates</h1>
 <p className="page-lede">Build once, then start a fresh goal with the same structure whenever you need it.</p>
 </div>
 <div className="page-head-actions">
 <Link className="btn btn-secondary" href="/goal/new#ai">
 <Sparkles className="h-4 w-4" /> Plan with AI
 </Link>
 <button className="btn btn-secondary" onClick={() => setImportOpen(true)}>
 <Download className="h-4 w-4" /> Import code
 </button>
 <button className="btn btn-secondary" onClick={openCopy}>
 <Copy className="h-4 w-4" /> From a goal
 </button>
 <button className="btn btn-primary" onClick={() => setBuilderOpen(true)}>
 <Plus className="h-4 w-4" /> New template
 </button>
 </div>
 </div>

 {error && (
 <div className="mb-4 rounded-lg p-3 text-sm" style={{ background: 'var(--tn-pr-high-bg)', color: 'var(--tn-pr-high-fg)' }}>
 {error}
 </div>
 )}

 <div className="mb-7 flex items-start gap-3 rounded-xl border border-border bg-muted/30 p-4">
 <LockKeyhole className="mt-0.5 h-4 w-4 flex-none text-muted-foreground" />
 <div>
 <div className="text-sm font-medium">Private by default</div>
 <p className="mt-0.5 text-xs text-muted-foreground">
 Share codes are unlisted and revocable. A searchable public community library is planned separately.
 </p>
 </div>
 </div>

 <section className="section">
 <div className="mb-3 flex items-end justify-between gap-3">
 <div>
 <h2 className="text-lg font-semibold">My templates</h2>
 <p className="text-sm text-muted-foreground">Created from scratch or copied from your goals.</p>
 </div>
 </div>
 {loading ? (
 <div className="card p-8 text-center text-sm text-muted-foreground">Loading your templates…</div>
 ) : personalTemplates.length === 0 ? (
 <div className="card flex flex-col items-center px-5 py-10 text-center">
 <span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
 <LayoutTemplate className="h-6 w-6 text-muted-foreground" />
 </span>
 <h3 className="text-base font-semibold">Create your first reusable template</h3>
 <p className="mt-1 max-w-md text-sm text-muted-foreground">Start with a blank structure, or save one of your existing goals with all of its nested work.</p>
 <div className="mt-4 flex flex-wrap justify-center gap-2">
 <Link className="btn btn-secondary" href="/goal/new#ai"><Sparkles className="h-4 w-4" /> Plan with AI</Link>
 <button className="btn btn-secondary" onClick={openCopy}><Copy className="h-4 w-4" /> Copy a goal</button>
 <button className="btn btn-primary" onClick={() => setBuilderOpen(true)}><Plus className="h-4 w-4" /> Create from scratch</button>
 </div>
 </div>
 ) : (
 <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
 {personalTemplates.map((template) => {
 const stats = getBlueprintStats(template.blueprint);
 return (
 <article key={template.id} className="card flex min-h-64 flex-col gap-3 p-4">
 <div className="flex items-start gap-3">
 <TemplateIcon id={template.id} tags={template.tags} personal />
 <div className="min-w-0 flex-1">
 <div className="flex items-start justify-between gap-2">
 <h3 className="break-words text-sm font-semibold">{template.title}</h3>
 <span className="pill flex-none">{template.share_code ? 'Shared' : 'Private'}</span>
 </div>
 <div className="mt-1 text-xs text-muted-foreground">
 {template.blueprint?.source?.type === 'goal' ? 'Copied from a goal' : 'Created from scratch'}
 </div>
 </div>
 </div>
 <p className="line-clamp-3 flex-1 text-sm leading-6 text-muted-foreground">
 {template.description || 'No description yet.'}
 </p>
 <StatLine stats={stats} durationDays={template.blueprint?.duration_days} />
 {template.tags && template.tags.length > 0 && (
 <div className="flex flex-wrap gap-1">
 {template.tags.map((tag) => <span key={tag} className="pill">#{tag}</span>)}
 </div>
 )}
 <div className="mt-auto flex gap-2 border-t border-border pt-3">
 <button
 className="btn btn-primary flex-1 justify-center"
 onClick={() => void useBackendTemplate(template)}
 disabled={instantiatingId !== null}
 >
 {instantiatingId === template.id ? 'Creating…' : 'Use template'}
 </button>
 <button
 className="btn btn-secondary px-2.5"
 onClick={() => setShareTarget(template)}
 aria-label={`Share ${template.title}`}
 title={template.share_code ? 'View share code' : 'Share template'}
 >
 <Share2 className="h-4 w-4" />
 </button>
 <button className="btn btn-secondary px-2.5" onClick={() => setDeleteTarget(template)} aria-label={`Delete ${template.title}`}>
 <Trash2 className="h-4 w-4" />
 </button>
 </div>
 </article>
 );
 })}
 </div>
 )}
 </section>

 <section className="section mt-9">
 <div className="mb-3">
 <h2 className="text-lg font-semibold">Starter library</h2>
 <p className="text-sm text-muted-foreground">Ready-made systems maintained by TaskNest.</p>
 </div>
 <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
 {GOAL_TEMPLATES.map((template) => {
 const stats = {
 milestones: template.blueprint.milestones.length,
 tasks: countTemplateTasks(template),
 todos: countTemplateTodos(template),
 subtasks: countTemplateSubtasks(template),
 metrics: countTemplateMetrics(template),
 };
 const busyKey = `starter:${template.id}`;
 return (
 <article key={template.id} className="card flex min-h-64 flex-col gap-3 p-4">
 <div className="flex items-center gap-3">
 <TemplateIcon id={template.id} tags={template.tags} />
 <h3 className="text-sm font-semibold">{template.title}</h3>
 </div>
 <p className="line-clamp-3 flex-1 text-sm leading-6 text-muted-foreground">{template.description}</p>
 <StatLine stats={stats} durationDays={template.durationDays} />
 <button className="btn btn-primary mt-auto w-full justify-center" onClick={() => void useStarterTemplate(template)} disabled={instantiatingId !== null}>
 {instantiatingId === busyKey ? 'Creating…' : 'Use template'}
 </button>
 </article>
 );
 })}
 {systemTemplates.map((template) => {
 const stats = getBlueprintStats(template.blueprint);
 return (
 <article key={template.id} className="card flex min-h-64 flex-col gap-3 p-4">
 <div className="flex items-center gap-3">
 <TemplateIcon id={template.id} tags={template.tags} />
 <h3 className="text-sm font-semibold">{template.title}</h3>
 </div>
 <p className="line-clamp-3 flex-1 text-sm leading-6 text-muted-foreground">{template.description || 'A ready-to-use goal template.'}</p>
 <StatLine stats={stats} durationDays={template.blueprint?.duration_days} />
 <button className="btn btn-primary mt-auto w-full justify-center" onClick={() => void useBackendTemplate(template)} disabled={instantiatingId !== null}>
 {instantiatingId === template.id ? 'Creating…' : 'Use template'}
 </button>
 </article>
 );
 })}
 </div>
 </section>

 <TemplateBuilderModal open={builderOpen} onClose={() => setBuilderOpen(false)} onCreated={registerTemplate} />
 <CopyGoalTemplateModal
 open={copyOpen}
 goals={goals}
 loadingGoals={isLoadingGoals}
 onClose={() => setCopyOpen(false)}
 onCreated={registerTemplate}
 />
 <ImportTemplateModal
 open={importOpen}
 onClose={() => setImportOpen(false)}
 onImported={registerTemplate}
 />
 <ShareTemplateModal
 open={shareTarget !== null}
 template={shareTarget}
 onClose={() => setShareTarget(null)}
 onUpdated={updateTemplate}
 />
 <ConfirmDialog
 open={deleteTarget !== null}
 title="Delete template?"
 description={deleteTarget ? `“${deleteTarget.title}” will be removed. Goals created from it will stay untouched.` : undefined}
 confirmLabel="Delete template"
 destructive
 busy={deleting}
 onConfirm={() => void deleteTemplate()}
 onCancel={() => setDeleteTarget(null)}
 />
 </div>
 );
};

export default withAuth(TemplatesPage);
