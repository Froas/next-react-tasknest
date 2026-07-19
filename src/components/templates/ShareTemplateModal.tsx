'use client';

import React, { useEffect, useState } from 'react';
import { Check, Copy, Link2, ShieldOff } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { templatesApi, type TemplateItem } from '@/lib/api';
import { toast } from '@/store/useToast';

type Props = {
 open: boolean;
 template: TemplateItem | null;
 onClose: () => void;
 onUpdated: (template: TemplateItem) => void;
};

export const ShareTemplateModal: React.FC<Props> = ({ open, template, onClose, onUpdated }) => {
 const [current, setCurrent] = useState<TemplateItem | null>(template);
 const [busy, setBusy] = useState(false);
 const [copied, setCopied] = useState(false);
 const [confirmRevoke, setConfirmRevoke] = useState(false);
 const [error, setError] = useState<string | null>(null);

 useEffect(() => {
 setCurrent(template);
 setCopied(false);
 setConfirmRevoke(false);
 setError(null);
 }, [template, open]);

 const enableSharing = async () => {
 if (!current) return;
 setBusy(true);
 setError(null);
 try {
 const updated = await templatesApi.share(current.id);
 setCurrent(updated);
 onUpdated(updated);
 } catch (err) {
 setError(err instanceof Error ? err.message : 'Failed to share template');
 } finally {
 setBusy(false);
 }
 };

 const copyCode = async () => {
 if (!current?.share_code) return;
 try {
 await navigator.clipboard.writeText(current.share_code);
 setCopied(true);
 toast.success('Share code copied');
 } catch {
 setError('Could not copy automatically. Select the code and copy it manually.');
 }
 };

 const revoke = async () => {
 if (!current) return;
 setBusy(true);
 setError(null);
 try {
 const updated = await templatesApi.stopSharing(current.id);
 setCurrent(updated);
 onUpdated(updated);
 setConfirmRevoke(false);
 toast.success('Sharing stopped');
 } catch (err) {
 setError(err instanceof Error ? err.message : 'Failed to stop sharing');
 } finally {
 setBusy(false);
 }
 };

 return (
 <Modal open={open} onClose={onClose} title={current ? `Share “${current.title}”` : 'Share template'} maxWidth="lg">
 {current && <div className="space-y-4">
 <p className="text-sm leading-6 text-muted-foreground">
 Anyone signed in to TaskNest can preview this template with the code and save an independent private copy.
 </p>
 {error && <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-600">{error}</div>}

 {!current.share_code ? (
 <div className="rounded-xl border border-dashed border-border p-5 text-center">
 <Link2 className="mx-auto h-6 w-6 text-muted-foreground" />
 <h4 className="mt-2 text-sm font-semibold">Create an unlisted share code</h4>
 <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-muted-foreground">
 The template will not appear in search or a public catalog. Only people with the code can open it.
 </p>
 <button className="btn btn-primary mt-4 justify-center" onClick={() => void enableSharing()} disabled={busy}>
 {busy ? 'Creating code…' : 'Create share code'}
 </button>
 </div>
 ) : (
 <div className="space-y-3">
 <div className="rounded-xl border border-border bg-muted/30 p-4">
 <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Share code</div>
 <div className="mt-2 flex flex-col gap-2 sm:flex-row">
 <code className="flex-1 select-all rounded-lg border border-border bg-card px-4 py-3 text-center text-lg font-semibold tracking-widest">
 {current.share_code}
 </code>
 <button className="btn btn-primary justify-center" onClick={() => void copyCode()}>
 {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
 {copied ? 'Copied' : 'Copy'}
 </button>
 </div>
 </div>
 {!confirmRevoke ? (
 <button className="btn btn-secondary w-full justify-center" onClick={() => setConfirmRevoke(true)} disabled={busy}>
 <ShieldOff className="h-4 w-4" /> Stop sharing
 </button>
 ) : (
 <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4">
 <p className="text-sm">This code will stop working. Copies already imported by other people will remain.</p>
 <div className="mt-3 flex justify-end gap-2">
 <button className="btn btn-secondary" onClick={() => setConfirmRevoke(false)} disabled={busy}>Keep sharing</button>
 <button className="btn justify-center bg-red-600 text-white hover:bg-red-700" onClick={() => void revoke()} disabled={busy}>
 {busy ? 'Stopping…' : 'Revoke code'}
 </button>
 </div>
 </div>
 )}
 </div>
 )}
 </div>}
 </Modal>
 );
};
