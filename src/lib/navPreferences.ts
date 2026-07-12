'use client';

import { useCallback, useEffect, useMemo, useState, type SetStateAction } from 'react';

export type NavItemId =
 | 'today'
 | 'goals'
 | 'milestones'
 | 'tasks'
 | 'todos'
 | 'events'
 | 'calendar'
 | 'notes'
 | 'tags'
 | 'review'
 | 'visualization'
 | 'templates'
 | 'archive'
 | 'trash'
 | 'activity';

export interface NavItem {
 id: NavItemId;
 name: string;
 href: string;
}

export const NAV_ITEMS: NavItem[] = [
 { id: 'today', name: 'Today', href: '/' },
 { id: 'goals', name: 'Goals', href: '/goal' },
 { id: 'milestones', name: 'Milestones', href: '/milestone' },
 { id: 'tasks', name: 'Tasks', href: '/task' },
 { id: 'todos', name: 'Todos', href: '/todo' },
 { id: 'events', name: 'Events', href: '/event' },
 { id: 'calendar', name: 'Calendar', href: '/calendar' },
 { id: 'notes', name: 'Notes', href: '/notes' },
 { id: 'tags', name: 'Tags', href: '/tags' },
 { id: 'review', name: 'Review', href: '/review' },
 { id: 'visualization', name: 'Visualization', href: '/visualization' },
 { id: 'templates', name: 'Templates', href: '/templates' },
 { id: 'archive', name: 'Archive', href: '/goal/archive' },
 { id: 'trash', name: 'Trash', href: '/trash' },
 { id: 'activity', name: 'Activity', href: '/activity' },
];

export interface NavPreferences {
 orderedIds: NavItemId[];
 primaryIds: NavItemId[];
 hiddenIds: NavItemId[];
}

export const DEFAULT_NAV_PREFERENCES: NavPreferences = {
 orderedIds: NAV_ITEMS.map((item) => item.id),
 primaryIds: ['today', 'goals', 'milestones', 'tasks', 'calendar'],
 hiddenIds: [],
};

const STORAGE_KEY = 'tasknest:pref:nav';
const NAV_EVENT = 'tasknest:nav-preferences-changed';
const VALID_IDS = new Set<NavItemId>(NAV_ITEMS.map((item) => item.id));

const isNavItemId = (value: unknown): value is NavItemId =>
 typeof value === 'string' && VALID_IDS.has(value as NavItemId);

export const normalizeNavPreferences = (value: unknown): NavPreferences => {
 const raw = (value ?? {}) as Partial<NavPreferences>;
 const orderedIds = Array.isArray(raw.orderedIds)
 ? raw.orderedIds.filter(isNavItemId)
 : [];
 const primaryIds = Array.isArray(raw.primaryIds)
 ? raw.primaryIds.filter(isNavItemId)
 : DEFAULT_NAV_PREFERENCES.primaryIds;
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

export function useNavPreferences() {
 const [preferences, setPreferencesState] = useState<NavPreferences>(DEFAULT_NAV_PREFERENCES);

 useEffect(() => {
 setPreferencesState(readPreferences());
 const sync = () => setPreferencesState(readPreferences());
 window.addEventListener(NAV_EVENT, sync);
 window.addEventListener('storage', sync);
 return () => {
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
