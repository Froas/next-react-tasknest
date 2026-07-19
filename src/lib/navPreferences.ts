'use client';

import { useCallback, useEffect, useMemo, useState, type SetStateAction } from 'react';
import { AuthRequiredError, userPrefsApi, usersApi } from '@/lib/api';

export type NavItemId =
 | 'today'
 | 'dashboard'
 | 'goals'
 | 'milestones'
 | 'tasks'
 | 'todos'
 | 'events'
 | 'calendar'
 | 'attention'
 | 'notes'
 | 'radar'
 | 'graph'
 | 'tags'
 | 'review'
 | 'visualization'
 | 'templates'
 | 'archive'
 | 'trash'
 | 'activity';

export type NavGroupId =
 | 'overview'
 | 'structure'
 | 'schedule'
 | 'focus'
 | 'knowledge'
 | 'explore'
 | 'library';

export const NAV_GROUP_LABELS: Record<NavGroupId, string> = {
 overview: 'Overview',
 structure: 'Structure',
 schedule: 'Schedule',
 focus: 'Focus & review',
 knowledge: 'Knowledge',
 explore: 'Explore',
 library: 'Library',
};

export interface NavItem {
 id: NavItemId;
 name: string;
 href: string;
 group: NavGroupId;
}

export const NAV_ITEMS: NavItem[] = [
 { id: 'today', name: 'Today', href: '/today', group: 'overview' },
 { id: 'dashboard', name: 'Dashboard', href: '/', group: 'overview' },
 { id: 'goals', name: 'Goals', href: '/goal', group: 'structure' },
 { id: 'milestones', name: 'Milestones', href: '/milestone', group: 'structure' },
 { id: 'tasks', name: 'Tasks', href: '/task', group: 'structure' },
 { id: 'todos', name: 'Todos', href: '/todo', group: 'structure' },
 { id: 'events', name: 'Events', href: '/event', group: 'schedule' },
 { id: 'calendar', name: 'Calendar', href: '/calendar', group: 'schedule' },
 { id: 'attention', name: 'Attention', href: '/attention', group: 'focus' },
 { id: 'notes', name: 'Notes', href: '/notes', group: 'knowledge' },
 { id: 'radar', name: 'Radar', href: '/radar', group: 'explore' },
 { id: 'graph', name: 'Graph', href: '/graph', group: 'explore' },
 { id: 'tags', name: 'Tags', href: '/tags', group: 'knowledge' },
 { id: 'review', name: 'Review', href: '/review', group: 'focus' },
 { id: 'visualization', name: 'Visualization', href: '/visualization', group: 'explore' },
 { id: 'templates', name: 'Templates', href: '/templates', group: 'library' },
 { id: 'archive', name: 'Archive', href: '/goal/archive', group: 'library' },
 { id: 'trash', name: 'Trash', href: '/trash', group: 'library' },
 { id: 'activity', name: 'Activity', href: '/activity', group: 'focus' },
];

export interface NavPreferences {
 orderedIds: NavItemId[];
 primaryIds: NavItemId[];
 hiddenIds: NavItemId[];
}

export const DEFAULT_NAV_PREFERENCES: NavPreferences = {
 orderedIds: NAV_ITEMS.map((item) => item.id),
 primaryIds: ['today', 'dashboard', 'goals', 'tasks', 'calendar', 'visualization'],
 hiddenIds: [],
};

const STORAGE_KEY = 'tasknest:pref:nav';
const NAV_EVENT = 'tasknest:nav-preferences-changed';
const VALID_IDS = new Set<NavItemId>(NAV_ITEMS.map((item) => item.id));

const isNavItemId = (value: unknown): value is NavItemId =>
 typeof value === 'string' && VALID_IDS.has(value as NavItemId);

export const normalizeNavPreferences = (value: unknown): NavPreferences => {
 const raw = (value ?? {}) as Partial<NavPreferences>;
 const legacyTodayWasDashboard = Array.isArray(raw.orderedIds)
 && raw.orderedIds.includes('today')
 && !raw.orderedIds.includes('dashboard');
 let orderedIds = Array.isArray(raw.orderedIds)
 ? raw.orderedIds.filter(isNavItemId)
 : [];
 let primaryIds = Array.isArray(raw.primaryIds)
 ? raw.primaryIds.filter(isNavItemId)
 : DEFAULT_NAV_PREFERENCES.primaryIds;
 if (legacyTodayWasDashboard) {
 const todayOrderIndex = orderedIds.indexOf('today');
 orderedIds = [
 ...orderedIds.slice(0, todayOrderIndex + 1),
 'dashboard',
 ...orderedIds.slice(todayOrderIndex + 1),
 ];
 if (primaryIds.includes('today') && !primaryIds.includes('dashboard')) {
 const todayPrimaryIndex = primaryIds.indexOf('today');
 primaryIds = [
 ...primaryIds.slice(0, todayPrimaryIndex + 1),
 'dashboard',
 ...primaryIds.slice(todayPrimaryIndex + 1),
 ];
 }
 }
 const hiddenIds = Array.isArray(raw.hiddenIds)
 ? raw.hiddenIds.filter(isNavItemId)
 : [];
 const completeOrder = [
 ...orderedIds,
 ...NAV_ITEMS.map((item) => item.id).filter((id) => !orderedIds.includes(id)),
 ];

 return {
 orderedIds: completeOrder,
 primaryIds: Array.from(new Set(primaryIds)),
 hiddenIds: Array.from(new Set(hiddenIds)),
 };
};

const readPreferences = (): NavPreferences => {
 if (typeof window === 'undefined') return DEFAULT_NAV_PREFERENCES;
 try {
 const raw = window.localStorage.getItem(STORAGE_KEY);
 return raw ? normalizeNavPreferences(JSON.parse(raw)) : DEFAULT_NAV_PREFERENCES;
 } catch {
 return DEFAULT_NAV_PREFERENCES;
 }
};

const writePreferences = (preferences: NavPreferences) => {
 if (typeof window === 'undefined') return;
 try {
 window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
 window.dispatchEvent(new Event(NAV_EVENT));
 } catch {
 /* localStorage disabled/quota — keep in-memory state */
 }
};

export function deriveNavItems(preferences: NavPreferences) {
 const byId = new Map(NAV_ITEMS.map((item) => [item.id, item]));
 const hidden = new Set(preferences.hiddenIds);
 const primary = new Set(preferences.primaryIds);
 const ordered = preferences.orderedIds
 .map((id) => byId.get(id))
 .filter((item): item is NavItem => !!item && !hidden.has(item.id));

 return {
 visibleItems: ordered,
 primaryItems: ordered.filter((item) => primary.has(item.id)),
 moreItems: ordered.filter((item) => !primary.has(item.id)),
 };
}

export function groupNavItems(items: NavItem[]) {
 return items.reduce<Array<{ id: NavGroupId; label: string; items: NavItem[] }>>((groups, item) => {
 const existing = groups.find((group) => group.id === item.group);
 if (existing) {
 existing.items.push(item);
 } else {
 groups.push({ id: item.group, label: NAV_GROUP_LABELS[item.group], items: [item] });
 }
 return groups;
 }, []);
}

export function useNavPreferences() {
 const [preferences, setPreferencesState] = useState<NavPreferences>(DEFAULT_NAV_PREFERENCES);

 useEffect(() => {
 const local = readPreferences();
 setPreferencesState(local);
 let cancelled = false;
 (async () => {
 try {
 const user = await usersApi.me();
 if (cancelled) return;
 if (user.nav_preferences) {
 const remote = normalizeNavPreferences(user.nav_preferences);
 writePreferences(remote);
 setPreferencesState(remote);
 } else {
 await userPrefsApi.updateMe({ nav_preferences: local });
 }
 } catch (caught) {
 if (!(caught instanceof AuthRequiredError)) console.warn('Failed to sync navigation preferences:', caught);
 }
 })();
 const sync = () => setPreferencesState(readPreferences());
 window.addEventListener(NAV_EVENT, sync);
 window.addEventListener('storage', sync);
 return () => {
 cancelled = true;
 window.removeEventListener(NAV_EVENT, sync);
 window.removeEventListener('storage', sync);
 };
 }, []);

 const setPreferences = useCallback((next: SetStateAction<NavPreferences>) => {
 setPreferencesState((current) => {
 const resolved = normalizeNavPreferences(
 typeof next === 'function' ? (next as (value: NavPreferences) => NavPreferences)(current) : next
 );
 writePreferences(resolved);
 void userPrefsApi.updateMe({ nav_preferences: resolved }).catch((caught) => {
 if (!(caught instanceof AuthRequiredError)) console.warn('Failed to save navigation preferences:', caught);
 });
 return resolved;
 });
 }, []);

 const resetPreferences = useCallback(() => {
 setPreferences(DEFAULT_NAV_PREFERENCES);
 }, [setPreferences]);

 const derived = useMemo(() => deriveNavItems(preferences), [preferences]);

 return {
 preferences,
 setPreferences,
 resetPreferences,
 ...derived,
 };
}
