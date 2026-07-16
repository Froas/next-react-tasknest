"use client";

import React, { useEffect, useRef, useState } from "react";
import { useAppSession } from "../clientwrapper";
import { backupApi, usersApi } from "@/lib/api";
import { useStore } from "@/store/useStore";
import { useShallow } from "zustand/react/shallow";
import { downloadJsonFile, parseImportFile } from "@/lib/exportImport";
import { buildIcs, downloadIcsFile } from "@/lib/icsExport";
import { toast } from "@/store/useToast";
import { useNotifications } from "@/store/useNotifications";
import { NAV_ITEMS, NavItemId, useNavPreferences } from "@/lib/navPreferences";
import { useDashboardPreferences } from '@/lib/dashboardPreferences';
import { DashboardWidgetSettings } from '@/components/dashboard/DashboardWidgetSettings';
import {
 Bell,
 BellOff,
 Bot,
 CalendarDays,
 ChevronDown,
 ChevronUp,
 DatabaseBackup,
 Download,
 ExternalLink,
 LayoutDashboard,
 Navigation,
 Palette,
 Plug,
 RotateCcw,
 Save,
 Upload,
 UserRound,
 type LucideIcon,
} from 'lucide-react';

const SettingsSection: React.FC<{
 id?: string;
 icon: LucideIcon;
 title: string;
 description?: string;
 action?: React.ReactNode;
 children: React.ReactNode;
}> = ({ id, icon: Icon, title, description, action, children }) => (
 <section id={id} className="card scroll-mt-20 !p-5 sm:!p-6">
 <header className="mb-5 flex flex-wrap items-start gap-3">
 <span
 className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border"
 style={{ border: 'var(--tn-line)', background: 'var(--tn-hover)', color: 'var(--tn-accent)' }}
 >
 <Icon className="h-5 w-5" strokeWidth={1.8} />
 </span>
 <div className="min-w-0 flex-1">
 <h2 className="text-base font-semibold" style={{ color: 'var(--tn-fg)' }}>{title}</h2>
 {description && <p className="mt-1 text-sm" style={{ color: 'var(--tn-fg-muted)' }}>{description}</p>}
 </div>
 {action}
 </header>
 {children}
 </section>
);

const IntegrationTile: React.FC<{
 icon: LucideIcon;
 title: string;
 detail: string;
 onClick?: () => void;
 disabled?: boolean;
}> = ({ icon: Icon, title, detail, onClick, disabled = false }) => (
 <button
 type="button"
 onClick={onClick}
 disabled={disabled}
 className="flex min-w-0 items-start gap-3 rounded-xl border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50"
 style={{ border: 'var(--tn-line)', background: 'var(--tn-surface-2, var(--tn-hover))' }}
 >
 <span className="mt-0.5" style={{ color: 'var(--tn-accent)' }}>
 <Icon className="h-5 w-5" strokeWidth={1.8} />
 </span>
 <span className="min-w-0">
 <span className="block text-sm font-semibold" style={{ color: 'var(--tn-fg)' }}>{title}</span>
 <span className="mt-1 block text-xs" style={{ color: 'var(--tn-fg-muted)' }}>{detail}</span>
 </span>
 </button>
);

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
 const {
 preferences: dashboardPreferences,
 setPreferences: setDashboardPreferences,
 resetPreferences: resetDashboardPreferences,
 } = useDashboardPreferences();

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

 const renderField = (label: string, value: string, field: string, editable = true) => (
 <div
 className="grid min-w-0 gap-2 rounded-xl border px-4 py-3 sm:grid-cols-[120px_minmax(0,1fr)] sm:items-center"
 style={{ border: 'var(--tn-line)', background: 'var(--tn-surface-2, var(--tn-hover))' }}
 >
 <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
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
 if (e.key ==="Escape") setEditField(null);
 }}
 className="filter-input h-10 w-full min-w-0"
 />
 ) : editable ? (
 <button
 type="button"
 onClick={() => setEditField(field)}
 className="min-h-10 min-w-0 rounded-lg px-3 py-2 text-left text-sm font-medium text-foreground hover:bg-background"
 title={`Edit ${label.toLowerCase()}`}
 >
 {value || <span className="text-muted-foreground">Click to set</span>}
 </button>
 ) : (
 <span className="min-w-0 truncate px-3 py-2 text-sm font-medium text-foreground">
 {value || <span className="text-muted-foreground">Not set</span>}
 </span>
 )}
 </div>
 );

 const TButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' }> = ({
 variant = 'ghost',
 style,
 className,
 children,
 ...rest
 }) => (
 <button
 {...rest}
 className={`${variant === 'primary' ? 'btn btn-primary' : 'btn btn-secondary'} justify-center ${className ?? ''}`}
 style={{
 ...(variant === 'danger' ? { color: 'var(--tn-bad)', borderColor: 'var(--tn-bad)' } : {}),
 opacity: rest.disabled ? 0.5 : 1,
 ...style,
 }}
 >
 {children}
 </button>
 );

 return (
 <div
 className="page"
 style={{
 maxWidth: 960,
 }}
 >
 <div className="page-head">
 <div className="page-eyebrow">Settings</div>
 <h1 className="page-title">Profile</h1>
 <p className="page-lede">Manage your identity, workspace layout, integrations, and data.</p>
 </div>

 {loading ? (
 <div className="card text-sm text-muted-foreground">Loading profile…</div>
 ) : (
 <div className="flex flex-col gap-5">
 {/* Identity */}
 <SettingsSection
 icon={UserRound}
 title="Identity"
 description="Your account details. Click the username to edit it."
 >
 <div className="space-y-2">
 {renderField("Username", username,"username", true)}
 {renderField("Email", email,"email", false)}
 </div>
 {changed && (
 <div className="mt-4 flex justify-end">
 <TButton variant="primary" onClick={handleSave} disabled={saving}>
 <Save className="h-4 w-4" />
 {saving ?"Saving…" :"Save changes"}
 </TButton>
 </div>
 )}
 {message && (
 <div className="mt-3 text-sm" style={{ color: message.startsWith('Failed') ? 'var(--tn-bad)' : 'var(--tn-good)' }}>
 {message}
 </div>
 )}
 </SettingsSection>

 {/* Integrations */}
 <SettingsSection
 icon={Plug}
 title="Integrations"
 description="Connect external services and control local browser notifications."
 >
 <div className="grid gap-3 md:grid-cols-3">
 <IntegrationTile
 icon={CalendarDays}
 title="Google Calendar"
 detail="Connect events and scheduled work."
 onClick={handleGoogleCalendar}
 />
 <IntegrationTile
 icon={Bot}
 title="Telegram bot"
 detail="Not configured yet."
 disabled
 />
 <IntegrationTile
 icon={notificationsEnabled ? BellOff : Bell}
 title={notificationsEnabled ? 'Disable notifications' : 'Browser notifications'}
 detail={notificationsEnabled ? 'Notifications are currently enabled.' : 'Get reminders for overdue work.'}
 onClick={handleToggleNotifications}
 />
 </div>
 </SettingsSection>

 {/* Appearance */}
 <SettingsSection
 icon={Palette}
 title="Appearance"
 description="Choose a design theme. Every setting on this page follows the active theme tokens."
 >
 <TButton variant="primary" onClick={() => (window.location.href = '/profile/themes')}>
 Browse themes <ExternalLink className="h-4 w-4" />
 </TButton>
 </SettingsSection>

 {/* Dashboard layout */}
 <SettingsSection
 id="dashboard-layout"
 icon={LayoutDashboard}
 title="Dashboard layout"
 description="Choose which dashboard widgets are visible, their order, and their size."
 >
 <DashboardWidgetSettings
 preferences={dashboardPreferences}
 setPreferences={setDashboardPreferences}
 onReset={resetDashboardPreferences}
 />
 </SettingsSection>

 {/* Navigation */}
 <SettingsSection
 id="navigation"
 icon={Navigation}
 title="Navigation"
 description="Choose what appears in the top navbar. Everything else stays available under More."
 action={(
 <TButton onClick={resetPreferences} className="!px-3 !py-2 text-xs">
 <RotateCcw className="h-3.5 w-3.5" /> Reset
 </TButton>
 )}
 >
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
 <div className="min-w-0">
 <div className="truncate text-sm font-semibold text-foreground">{item.name}</div>
 <div className="truncate text-xs text-muted-foreground">{item.href}</div>
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
 <ChevronUp className="h-4 w-4" />
 </button>
 <button
 type="button"
 onClick={() => moveNavItem(id, 1)}
 disabled={index === preferences.orderedIds.length - 1}
 className="btn btn-secondary"
 style={{ padding: '5px 9px', opacity: index === preferences.orderedIds.length - 1 ? 0.45 : 1 }}
 aria-label={`Move ${item.name} down`}
 >
 <ChevronDown className="h-4 w-4" />
 </button>
 </div>
 </div>
 );
 })}
 </div>
 </SettingsSection>

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
 <SettingsSection
 icon={DatabaseBackup}
 title="Backup and export"
 description="Export your workspace or import a previously downloaded TaskNest backup."
 >
 <div className="flex flex-wrap gap-2">
 <TButton onClick={handleExport} disabled={exporting}>
 <Download className="h-4 w-4" />
 {exporting ? 'Exporting…' : 'Export JSON'}
 </TButton>
 <TButton onClick={handleIcsExport}>
 <CalendarDays className="h-4 w-4" /> Export .ics
 </TButton>
 <TButton
 onClick={() => fileInputRef.current?.click()}
 disabled={importing}
 >
 <Upload className="h-4 w-4" />
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
 </SettingsSection>
 </div>
 )}
 </div>
 );
};

export default ProfilePage;
