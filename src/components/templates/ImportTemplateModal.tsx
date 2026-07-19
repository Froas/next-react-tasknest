'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Download, Search } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { templatesApi, type SharedTemplateItem, type TemplateItem } from '@/lib/api';

type Props = {
 open: boolean;
 onClose: () => void;
 onImported: (template: TemplateItem) => void;
};

const fieldClass = 'w-full px-3 py-2 border border-border bg-card text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring';

const normalizeCodeInput = (value: string) => value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 12);

export const ImportTemplateModal: React.FC<Props> = ({ open, onClose, onImported }) => {
 const [code, setCode] = useState('');
 const [preview, setPreview] = useState<SharedTemplateItem | null>(null);
 const [loading, setLoading] = useState(false);
 const [importing, setImporting] = useState(false);
 const [error, setError] = useState<string | null>(null);

 useEffect(() => {
 if (!open) {
 setCode('');
 setPreview(null);
 setError(null);
 }
 }, [open]);

 const stats = useMemo(() => {
 const goalTasks = preview?.blueprint?.goal_tasks ?? [];
 const milestones = preview?.blueprint?.milestones ?? [];
 const milestoneTasks = milestones.flatMap((milestone) => milestone.tasks ?? []);
 const tasks = [...goalTasks, ...milestoneTasks];
 return {
 milestones: milestones.length,
 tasks: tasks.length,
 routines: tasks.reduce((sum, task) => sum + (task.todos?.length ?? 0), 0),
 };
 }, [preview]);

 const lookup = async (event: React.FormEvent) => {
 event.preventDefault();
 if (!code.trim()) return;
 setLoading(true);
 setError(null);
 setPreview(null);
 try {
 setPreview(await templatesApi.previewShared(code.trim()));
 } catch (err) {
 setError(err instanceof Error ? err.message : 'Shared template not found');
 } finally {
 setLoading(false);
 }
 };

 const importTemplate = async () => {
 if (!preview) return;
 setImporting(true);
 setError(null);
 try {
 const imported = await templatesApi.importShared(preview.share_code);
 onImported(imported);
 onClose();
 } catch (err) {
 setError(err instanceof Error ? err.message : 'Failed to import template');
 } finally {
 setImporting(false);
 }
 };

 return (
 <Modal open={open} onClose={onClose} title="Import a shared template" maxWidth="lg">
 <div className="space-y-4">
 <form onSubmit={lookup} className="flex flex-col gap-2 sm:flex-row">
 <input
 autoFocus
 className={`${fieldClass} font-mono uppercase tracking-wider`}
 value={code}
 onChange={(event) => setCode(normalizeCodeInput(event.target.value))}
 placeholder="TN-ABCD-2345"
 aria-label="Share code"
 />
 <button className="btn btn-primary justify-center" type="submit" disabled={loading || !code.trim()}>
 <Search className="h-4 w-4" /> {loading ? 'Checking…' : 'Preview'}
 </button>
 </form>

 {error && <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-600">{error}</div>}

 {preview && (
 <div className="rounded-xl border border-border p-4">
 <div className="flex items-start justify-between gap-3">
 <div>
 <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Shared template</div>
 <h4 className="mt-1 text-base font-semibold">{preview.title}</h4>
 </div>
 <span className="pill">Unlisted</span>
 </div>
 {preview.description && <p className="mt-3 text-sm leading-6 text-muted-foreground">{preview.description}</p>}
 <div className="mt-3 text-xs text-muted-foreground">
 {stats.milestones} milestones · {stats.tasks} tasks · {stats.routines} routines
 </div>
 {preview.tags && preview.tags.length > 0 && (
 <div className="mt-3 flex flex-wrap gap-1">
 {preview.tags.map((tag) => <span key={tag} className="pill">#{tag}</span>)}
 </div>
 )}
 <button className="btn btn-primary mt-4 w-full justify-center" onClick={() => void importTemplate()} disabled={importing}>
 <Download className="h-4 w-4" /> {importing ? 'Importing…' : 'Add to my templates'}
 </button>
 </div>
 )}
 <p className="text-xs leading-5 text-muted-foreground">
 Imported templates are private copies. The sender cannot see your goals or change the copy after you import it.
 </p>
 </div>
 </Modal>
 );
};
