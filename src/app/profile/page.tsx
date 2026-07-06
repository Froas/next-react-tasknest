"use client";

import React, { useEffect, useRef, useState } from "react";
import { useAppSession } from "../clientwrapper";
import { Button } from "@/components/ui/button";
import { usersApi } from "@/lib/api";
import { useStore } from "@/store/useStore";
import { useShallow } from "zustand/react/shallow";
import { buildExportPayload, downloadJsonFile, parseImportFile } from "@/lib/exportImport";
import { buildIcs, downloadIcsFile } from "@/lib/icsExport";
import { toast } from "@/store/useToast";
import { useNotifications } from "@/store/useNotifications";

const ProfilePage = () => {
 const session = useAppSession();
 const [user, setUser] = useState<any>(null);
 const [username, setUsername] = useState("");
 const [email, setEmail] = useState("");
 const [loading, setLoading] = useState(true);
 const [saving, setSaving] = useState(false);
 const [message, setMessage] = useState("");
 const [editField, setEditField] = useState<string | null>(null);
 const [changed, setChanged] = useState(false);
 const [importing, setImporting] = useState(false);
 const fileInputRef = useRef<HTMLInputElement | null>(null);

 const goals = useStore((s) => s.goals);
 const milestones = useStore((s) => s.milestones);
 const tasks = useStore((s) => s.tasks);
 const todos = useStore((s) => s.todos);
 const events = useStore((s) => s.events);
 const { setGoals, setMilestones, setTasks, setTodos, setEvents } = useStore(
 useShallow((s) => ({
 setGoals: s.setGoals,
 setMilestones: s.setMilestones,
 setTasks: s.setTasks,
 setTodos: s.setTodos,
 setEvents: s.setEvents,
 }))
 );

 const handleExport = () => {
 const payload = buildExportPayload(goals, milestones, tasks, todos, events);
 const stamp = new Date().toISOString().slice(0, 10);
 downloadJsonFile(`tasknest-export-${stamp}.json`, payload);
 toast.success('Export downloaded');
 };

 const handleIcsExport = () => {
 const ics = buildIcs({ goals, events, onlyOpen: true });
 const stamp = new Date().toISOString().slice(0, 10);
 downloadIcsFile(`tasknest-${stamp}.ics`, ics);
 toast.success('Calendar export downloaded');
 };

 const notificationsEnabled = useNotifications((s) => s.enabled);
 const enableNotifications = useNotifications((s) => s.enable);
 const disableNotifications = useNotifications((s) => s.disable);

 const handleToggleNotifications = async () => {
 if (notificationsEnabled) {
 disableNotifications();
 toast.info('Notifications disabled');
 return;
 }
 const granted = await enableNotifications();
 if (granted) toast.success('Notifications enabled — you\'ll be nudged about overdue items.');
 else toast.error('Browser denied notification permission.');
 };

 const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 e.target.value = '';
 if (!file) return;
 setImporting(true);
 try {
 const payload = await parseImportFile(file);
 // Local-only restore — does not push to backend. The user can use this
 // to repopulate the in-memory store on a fresh device, but a real
 // server-side import requires backend support that doesn't exist yet.
 setGoals(payload.goals ?? []);
 setMilestones(payload.milestones ?? []);
 setTasks(payload.tasks ?? []);
 setTodos(payload.todos ?? []);
 setEvents(payload.events ?? []);
 toast.success('Import loaded into local view (not synced to server)');
 } catch (err) {
 console.error('Import failed:', err);
 toast.error(err instanceof Error ? err.message : 'Failed to import file');
 } finally {
 setImporting(false);
 }
 };

 useEffect(() => {
 const fetchUser = async () => {
 setLoading(true);
 try {
 const data = await usersApi.me();
 setUser(data);
 setUsername(data.username ||"");
 setEmail(data.email ||"");
 } catch (e) {
 setMessage("Failed to load user info");
 } finally {
 setLoading(false);
 }
 };
 fetchUser();
 }, []);

 const handleSave = async () => {
 setSaving(true);
 setMessage("");
 try {
 const updated = await usersApi.update({ id: user.id, username, email });
 setUser(updated);
 setMessage("Profile updated!");
 setChanged(false);
 setEditField(null);
 } catch (e) {
 setMessage("Failed to update profile");
 } finally {
 setSaving(false);
 }
 };

 const handleGoogleCalendar = async () => {
 const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
 `client_id=${process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID}` +
 `&redirect_uri=${process.env.NEXT_PUBLIC_REDIRECT_URL}` +
 `&response_type=code` +
 `&scope=${process.env.NEXT_PUBLIC_SCOPE}` +
 `&access_type=offline` +
 `&prompt=consent`;
 window.location.href = googleAuthUrl;
};

 // Theme-aware field renderer (uses --tn-* tokens so it reads on every theme).
 const renderField = (label: string, value: string, field: string, editable = true) => (
 <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0' }}>
 <span
 style={{
 color: 'var(--tn-fg-muted)',
 width: 96,
 fontSize: 13,
 fontWeight: 500,
 }}
 >
 {label}
 </span>
 {editField === field && editable ? (
 <input
 autoFocus
 type="text"
 value={value}
 onChange={e => {
 setChanged(true);
 if (field ==="username") setUsername(e.target.value);
 else if (field ==="email") setEmail(e.target.value);
 }}
 onBlur={() => setEditField(null)}
 onKeyDown={e => {
 if (e.key ==="Enter") setEditField(null);
 }}
 style={{
 borderBottom: '1px solid var(--tn-fg-muted)',
 background: 'transparent',
 padding: '2px 4px',
 color: 'var(--tn-fg)',
 outline: 'none',
 fontSize: 14,
 minWidth: 160,
 }}
 />
 ) : (
 <span
 onClick={() => editable && setEditField(field)}
 style={{
 fontSize: 14,
 color: 'var(--tn-fg)',
 cursor: editable ? 'pointer' : 'default',
 padding: '2px 6px',
 borderRadius: 4,
 }}
 >
 {value || <span style={{ color: 'var(--tn-fg-dim, var(--tn-fg-muted))' }}>Click to set</span>}
 </span>
 )}
 </div>
 );

 // Theme-aware button (replaces shadcn Button which uses hardcoded gray fallbacks).
 const TButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' }> = ({
 variant = 'ghost',
 style,
 children,
 ...rest
 }) => (
 <button
 {...rest}
 style={{
 padding: '8px 14px',
 fontSize: 13,
 fontWeight: 500,
 border: 'var(--tn-line)',
 background:
 variant === 'primary'
 ? 'var(--tn-accent)'
 : variant === 'danger'
 ? 'transparent'
 : 'transparent',
 color:
 variant === 'primary'
 ? 'var(--tn-on-accent)'
 : variant === 'danger'
 ? 'var(--tn-bad, #c25d63)'
 : 'var(--tn-fg)',
 borderRadius: 'var(--tn-r-md, 6px)',
 cursor: rest.disabled ? 'not-allowed' : 'pointer',
 opacity: rest.disabled ? 0.5 : 1,
 ...style,
 }}
 >
 {children}
 </button>
 );

 return (
 <div
 style={{
 maxWidth: 720,
 margin: '0 auto',
 padding: '32px 24px 80px',
 color: 'var(--tn-fg)',
 }}
 >
 <div style={{ marginBottom: 32 }}>
 <div
 style={{
 fontSize: 11,
 color: 'var(--tn-fg-muted)',
 letterSpacing: '0.1em',
 textTransform: 'uppercase',
 marginBottom: 8,
 }}
 >
 Settings
 </div>
 <h1
 style={{
 fontSize: 32,
 fontWeight: 600,
 letterSpacing: '-0.02em',
 fontFamily: 'var(--tn-font-display, var(--tn-font-sans))',
 }}
 >
 Profile
 </h1>
 </div>

 {loading ? (
 <div style={{ color: 'var(--tn-fg-muted)' }}>Loading…</div>
 ) : (
 <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
 {/* Identity */}
 <section
 style={{
 background: 'var(--tn-card)',
 border: 'var(--tn-line)',
 borderRadius: 'var(--tn-r-lg, 8px)',
 padding: 20,
 boxShadow: 'var(--tn-shadow)',
 }}
 >
 <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
 Identity
 </h2>
 {renderField("Username", username,"username", true)}
 {renderField("Email", email,"email", false)}
 {changed && (
 <div style={{ marginTop: 12 }}>
 <TButton variant="primary" onClick={handleSave} disabled={saving}>
 {saving ?"Saving…" :"Save changes"}
 </TButton>
 </div>
 )}
 {message && (
 <div
 style={{
 fontSize: 13,
 color: 'var(--tn-good, #2f7d50)',
 marginTop: 8,
 }}
 >
 {message}
 </div>
 )}
 </section>

 {/* Integrations */}
 <section>
 <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
 Integrations
 </h2>
 <p
 style={{
 fontSize: 13,
 color: 'var(--tn-fg-muted)',
 marginBottom: 12,
 }}
 >
 Connect external calendars and chat bots.
 </p>
 <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
 <TButton onClick={handleGoogleCalendar}>
 Google Calendar Integration
 </TButton>
 <TButton disabled>Telegram Bot Integration</TButton>
 <TButton onClick={handleToggleNotifications}>
 {notificationsEnabled
 ? 'Disable browser notifications'
 : 'Enable browser notifications'}
 </TButton>
 </div>
 </section>

 {/* Appearance */}
 <section>
 <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
 Appearance
 </h2>
 <p
 style={{
 fontSize: 13,
 color: 'var(--tn-fg-muted)',
 marginBottom: 12,
 }}
 >
 Pick a design theme. 13 themes available — Notion, Glass, Bento,
 Pixel, Brutalist, Memphis, Sketchbook, Adventure, Glass Dark,
 Terminal, Solarpunk, Cottagecore, Cyberpunk Neon.
 </p>
 <TButton variant="primary" onClick={() => (window.location.href = '/profile/themes')}>
 Browse themes →
 </TButton>
 </section>

 {/* Backup */}
 <section>
 <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
 Backup
 </h2>
 <p
 style={{
 fontSize: 13,
 color: 'var(--tn-fg-muted)',
 marginBottom: 12,
 }}
 >
 Export your full tree (goals, milestones, tasks, todos, events) as
 JSON. Import restores the local view only — it does not write back
 to the server.
 </p>
 <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
 <TButton onClick={handleExport}>Export JSON</TButton>
 <TButton onClick={handleIcsExport}>Export .ics (calendar)</TButton>
 <TButton
 onClick={() => fileInputRef.current?.click()}
 disabled={importing}
 >
 {importing ? 'Importing…' : 'Import JSON'}
 </TButton>
 <input
 ref={fileInputRef}
 type="file"
 accept="application/json"
 onChange={handleImportFile}
 style={{ display: 'none' }}
 />
 </div>
 </section>
 </div>
 )}
 </div>
 );
};

export default ProfilePage; 