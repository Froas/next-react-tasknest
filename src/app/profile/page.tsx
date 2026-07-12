"use client";

import React, { useEffect, useRef, useState } from "react";
import { useAppSession } from "../clientwrapper";
import { Button } from "@/components/ui/button";
import { backupApi, usersApi } from "@/lib/api";
import { useStore } from "@/store/useStore";
import { useShallow } from "zustand/react/shallow";
import { downloadJsonFile, parseImportFile } from "@/lib/exportImport";
import { buildIcs, downloadIcsFile } from "@/lib/icsExport";
import { toast } from "@/store/useToast";
import { useNotifications } from "@/store/useNotifications";
import { NAV_ITEMS, NavItemId, useNavPreferences } from "@/lib/navPreferences";

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
 const [exporting, setExporting] = useState(false);
 const [importing, setImporting] = useState(false);
 const fileInputRef = useRef<HTMLInputElement | null>(null);
 const { preferences, setPreferences, resetPreferences } = useNavPreferences();

 const goals = useStore((s) => s.goals);
 const milestones = useStore((s) => s.milestones);
 const tasks = useStore((s) => s.tasks);
 const todos = useStore((s) => s.todos);
 const events = useStore((s) => s.events);
 const { fetchGoals, fetchMilestones, fetchTasks, fetchTodos, fetchEvents } = useStore(
 useShallow((s) => ({
 fetchGoals: s.fetchGoals,
 fetchMilestones: s.fetchMilestones,
 fetchTasks: s.fetchTasks,
 fetchTodos: s.fetchTodos,
 fetchEvents: s.fetchEvents,
 }))
 );

 const refreshWorkspace = async () => {
 await Promise.all([
 fetchGoals({ force: true }),
 fetchMilestones({ force: true }),
 fetchTasks({ force: true }),
 fetchTodos({ force: true }),
 fetchEvents({ force: true }),
 ]);
 };

 const handleExport = async () => {
 setExporting(true);
 try {
 const payload = await backupApi.exportData();
 const stamp = new Date().toISOString().slice(0, 10);
 downloadJsonFile(`tasknest-export-${stamp}.json`, payload);
 toast.success('Export downloaded');
 } catch (err) {
 console.error('Export failed:', err);
 toast.error(err instanceof Error ? err.message : 'Failed to export backup');
 } finally {
 setExporting(false);
 }
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
 const result = await backupApi.importData(payload);
 await refreshWorkspace();
 const total = Object.values(result.imported).reduce((sum, value) => sum + value, 0);
 toast.success(`Imported ${total} item${total === 1 ? '' : 's'} to server`);
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
 const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
 const redirectUri = process.env.NEXT_PUBLIC_REDIRECT_URL;
 const scope = process.env.NEXT_PUBLIC_SCOPE || 'https://www.googleapis.com/auth/calendar.events';
 if (!clientId || !redirectUri) {
 toast.error('Google Calendar is not configured. Add NEXT_PUBLIC_GOOGLE_CLIENT_ID and NEXT_PUBLIC_REDIRECT_URL.');
 return;
 }
 const params = new URLSearchParams({
 client_id: clientId,
 redirect_uri: redirectUri,
 response_type: 'code',
 scope,
 access_type: 'offline',
 prompt: 'consent',
 });
 window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
};

 const moveNavItem = (id: NavItemId, direction: -1 | 1) => {
 setPreferences((current) => {
 const orderedIds = [...current.orderedIds];
 const index = orderedIds.indexOf(id);
 const nextIndex = index + direction;
 if (index < 0 || nextIndex < 0 || nextIndex >= orderedIds.length) return current;
 [orderedIds[index], orderedIds[nextIndex]] = [orderedIds[nextIndex], orderedIds[index]];
 return { ...current, orderedIds };
 });
 };

 const toggleNavHidden = (id: NavItemId) => {
 setPreferences((current) => {
 const hidden = new Set(current.hiddenIds);
 if (hidden.has(id)) hidden.delete(id);
 else hidden.add(id);
 return { ...current, hiddenIds: Array.from(hidden) };
 });
 };

 const toggleNavPrimary = (id: NavItemId) => {
 setPreferences((current) => {
 const primary = new Set(current.primaryIds);
 if (primary.has(id)) primary.delete(id);
 else primary.add(id);
 return { ...current, primaryIds: Array.from(primary) };
 });
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

 {/* Navigation */}
 <section
 id="navigation"
 style={{
 background: 'var(--tn-card)',
 border: 'var(--tn-line)',
 borderRadius: 'var(--tn-r-lg, 8px)',
 padding: 20,
 boxShadow: 'var(--tn-shadow)',
 scrollMarginTop: 80,
 }}
 >
 <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
 <div style={{ flex: 1 }}>
 <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
 Navigation
 </h2>
 <p style={{ fontSize: 13, color: 'var(--tn-fg-muted)' }}>
 Choose what appears in the top navbar. Items not pinned to the top stay under More.
 </p>
 </div>
 <TButton onClick={resetPreferences}>Reset</TButton>
 </div>

 <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
 {preferences.orderedIds.map((id, index) => {
 const item = NAV_ITEMS.find((navItem) => navItem.id === id);
 if (!item) return null;
 const hidden = preferences.hiddenIds.includes(id);
 const primary = preferences.primaryIds.includes(id);
 return (
 <div
 key={id}
 className="profile-nav-row"
 style={{
 display: 'grid',
 gridTemplateColumns: 'minmax(120px, 1fr) auto auto auto',
 alignItems: 'center',
 gap: 10,
 padding: '10px 12px',
 border: 'var(--tn-line)',
 borderRadius: 'var(--tn-r-md, 8px)',
 background: hidden ? 'var(--tn-surface-2, var(--tn-hover))' : 'var(--tn-card)',
 opacity: hidden ? 0.7 : 1,
 }}
 >
 <div>
 <div style={{ fontSize: 14, fontWeight: 600 }}>{item.name}</div>
 <div style={{ fontSize: 12, color: 'var(--tn-fg-muted)' }}>{item.href}</div>
 </div>
 <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--tn-fg-muted)' }}>
 <input
 type="checkbox"
 checked={!hidden}
 onChange={() => toggleNavHidden(id)}
 style={{ accentColor: 'var(--tn-accent)' }}
 />
 Visible
 </label>
 <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--tn-fg-muted)' }}>
 <input
 type="checkbox"
 checked={primary}
 onChange={() => toggleNavPrimary(id)}
 disabled={hidden}
 style={{ accentColor: 'var(--tn-accent)' }}
 />
 Top bar
 </label>
 <div style={{ display: 'flex', gap: 4 }}>
 <button
 type="button"
 onClick={() => moveNavItem(id, -1)}
 disabled={index === 0}
 className="btn btn-secondary"
 style={{ padding: '5px 9px', opacity: index === 0 ? 0.45 : 1 }}
 aria-label={`Move ${item.name} up`}
 >
 ↑
 </button>
 <button
 type="button"
 onClick={() => moveNavItem(id, 1)}
 disabled={index === preferences.orderedIds.length - 1}
 className="btn btn-secondary"
 style={{ padding: '5px 9px', opacity: index === preferences.orderedIds.length - 1 ? 0.45 : 1 }}
 aria-label={`Move ${item.name} down`}
 >
 ↓
 </button>
 </div>
 </div>
 );
 })}
 </div>
 </section>

 <style jsx>{`
 @media (max-width: 620px) {
 :global(.profile-nav-row) {
 grid-template-columns: 1fr !important;
 align-items: stretch !important;
 }
 :global(.profile-nav-row label),
 :global(.profile-nav-row > div:last-child) {
 justify-content: space-between !important;
 }
 }
 `}</style>

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
 Export your full tree (goals, milestones, tasks, subtasks, todos,
 events) from the server as JSON. Import appends items to your account
 and keeps them after reload.
 </p>
 <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
 <TButton onClick={handleExport} disabled={exporting}>
 {exporting ? 'Exporting…' : 'Export JSON'}
 </TButton>
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
