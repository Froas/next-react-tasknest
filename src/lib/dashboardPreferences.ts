'use client';

import { useCallback, useEffect, useMemo, useState, type SetStateAction } from 'react';
import { AuthRequiredError, userPrefsApi, usersApi } from '@/lib/api';

export type DashboardWidgetArea = 'main' | 'sidebar';
export type DashboardDevice = 'desktop' | 'mobile';
export type DashboardWidgetSize = 'compact' | 'wide' | 'full';
export type DashboardWidgetId =
  | 'today'
  | 'activity'
  | 'inbox'
  | 'recently-finished'
  | 'overall-progress'
  | 'calendar'
  | 'quick-actions';

export interface DashboardWidgetDefinition {
  id: DashboardWidgetId;
  name: string;
  description: string;
  area: DashboardWidgetArea;
  defaultSize: DashboardWidgetSize;
  sizes: DashboardWidgetSize[];
}

export const DASHBOARD_WIDGETS: DashboardWidgetDefinition[] = [
  { id: 'today', name: 'Today', description: 'Routines, metrics, due work, and Daily Log.', area: 'main', defaultSize: 'full', sizes: ['wide', 'full'] },
  { id: 'activity', name: 'Activity', description: 'Long-range completion heatmap.', area: 'main', defaultSize: 'wide', sizes: ['compact', 'wide'] },
  { id: 'inbox', name: 'Inbox', description: 'Scratch todos and incoming work.', area: 'main', defaultSize: 'wide', sizes: ['wide', 'full'] },
  { id: 'recently-finished', name: 'Recently Finished', description: 'Latest completed work.', area: 'main', defaultSize: 'compact', sizes: ['compact', 'wide'] },
  { id: 'overall-progress', name: 'Overall Progress', description: 'Completed goals summary.', area: 'main', defaultSize: 'compact', sizes: ['compact'] },
  { id: 'calendar', name: 'Calendar', description: 'Month overview and selected-day work.', area: 'sidebar', defaultSize: 'wide', sizes: ['compact', 'wide'] },
  { id: 'quick-actions', name: 'Quick Actions', description: 'Create goals, milestones, tasks, and routines.', area: 'sidebar', defaultSize: 'wide', sizes: ['compact', 'wide'] },
];

export interface DashboardLayoutProfile {
  orderedIds: DashboardWidgetId[];
  hiddenIds: DashboardWidgetId[];
  sizes: Partial<Record<DashboardWidgetId, DashboardWidgetSize>>;
}

export interface DashboardPreferences {
  version: 2;
  desktop: DashboardLayoutProfile;
  mobile: DashboardLayoutProfile;
}

const defaultProfile = (): DashboardLayoutProfile => ({
  orderedIds: DASHBOARD_WIDGETS.map((widget) => widget.id),
  hiddenIds: [],
  sizes: Object.fromEntries(DASHBOARD_WIDGETS.map((widget) => [widget.id, widget.defaultSize])),
});

export const DEFAULT_DASHBOARD_PREFERENCES: DashboardPreferences = {
  version: 2,
  desktop: defaultProfile(),
  mobile: defaultProfile(),
};

const STORAGE_KEY = 'tasknest:pref:dashboard';
const DASHBOARD_EVENT = 'tasknest:dashboard-preferences-changed';
const VALID_IDS = new Set(DASHBOARD_WIDGETS.map((widget) => widget.id));
const VALID_SIZES = new Set<DashboardWidgetSize>(['compact', 'wide', 'full']);

const isWidgetId = (value: unknown): value is DashboardWidgetId => (
  typeof value === 'string' && VALID_IDS.has(value as DashboardWidgetId)
);

const normalizeProfile = (value: unknown, fallback?: DashboardLayoutProfile): DashboardLayoutProfile => {
  const raw = (value ?? {}) as Partial<DashboardLayoutProfile>;
  const orderedIds = Array.isArray(raw.orderedIds) ? raw.orderedIds.filter(isWidgetId) : fallback?.orderedIds ?? [];
  const hiddenIds = Array.isArray(raw.hiddenIds) ? raw.hiddenIds.filter(isWidgetId) : fallback?.hiddenIds ?? [];
  const rawSizes = raw.sizes && typeof raw.sizes === 'object' ? raw.sizes : fallback?.sizes ?? {};
  const sizes: DashboardLayoutProfile['sizes'] = {};
  DASHBOARD_WIDGETS.forEach((widget) => {
    const candidate = rawSizes[widget.id];
    sizes[widget.id] = VALID_SIZES.has(candidate as DashboardWidgetSize) && widget.sizes.includes(candidate as DashboardWidgetSize)
      ? candidate as DashboardWidgetSize
      : widget.defaultSize;
  });
  return {
    orderedIds: [
      ...Array.from(new Set(orderedIds)),
      ...DASHBOARD_WIDGETS.map((widget) => widget.id).filter((id) => !orderedIds.includes(id)),
    ],
    hiddenIds: Array.from(new Set(hiddenIds)),
    sizes,
  };
};

export const normalizeDashboardPreferences = (value: unknown): DashboardPreferences => {
  const raw = (value ?? {}) as Partial<DashboardPreferences> & Partial<DashboardLayoutProfile>;
  if (raw.version === 2 || raw.desktop || raw.mobile) {
    const desktop = normalizeProfile(raw.desktop);
    return {
      version: 2,
      desktop,
      mobile: normalizeProfile(raw.mobile, desktop),
    };
  }
  const legacy = normalizeProfile(raw);
  return { version: 2, desktop: legacy, mobile: normalizeProfile(legacy) };
};

export interface DashboardWidgetPlacement extends DashboardWidgetDefinition {
  size: DashboardWidgetSize;
}

export const deriveDashboardWidgets = (preferences: DashboardPreferences, device: DashboardDevice = 'desktop') => {
  const profile = preferences[device];
  const byId = new Map(DASHBOARD_WIDGETS.map((widget) => [widget.id, widget]));
  const hidden = new Set(profile.hiddenIds);
  const visible = profile.orderedIds
    .map((id) => byId.get(id))
    .filter((widget): widget is DashboardWidgetDefinition => widget !== undefined && !hidden.has(widget.id))
    .map((widget): DashboardWidgetPlacement => ({
      ...widget,
      size: profile.sizes[widget.id] ?? widget.defaultSize,
    }));
  return {
    mainWidgets: visible.filter((widget) => widget.area === 'main'),
    sidebarWidgets: visible.filter((widget) => widget.area === 'sidebar'),
  };
};

const updateProfile = (
  preferences: DashboardPreferences,
  device: DashboardDevice,
  updater: (profile: DashboardLayoutProfile) => DashboardLayoutProfile,
): DashboardPreferences => ({ ...preferences, [device]: updater(preferences[device]) });

export const moveDashboardWidget = (
  preferences: DashboardPreferences,
  widgetId: DashboardWidgetId,
  direction: -1 | 1,
  device: DashboardDevice = 'desktop',
): DashboardPreferences => updateProfile(preferences, device, (profile) => {
  const definition = DASHBOARD_WIDGETS.find((widget) => widget.id === widgetId);
  if (!definition) return profile;
  const areaIds = profile.orderedIds.filter((id) => (
    DASHBOARD_WIDGETS.find((widget) => widget.id === id)?.area === definition.area
  ));
  const currentIndex = areaIds.indexOf(widgetId);
  const targetIndex = currentIndex + direction;
  if (currentIndex < 0 || targetIndex < 0 || targetIndex >= areaIds.length) return profile;
  return reorderDashboardWidgetInProfile(profile, widgetId, areaIds[targetIndex]);
});

const reorderDashboardWidgetInProfile = (
  profile: DashboardLayoutProfile,
  widgetId: DashboardWidgetId,
  targetId: DashboardWidgetId,
): DashboardLayoutProfile => {
  if (widgetId === targetId) return profile;
  const widget = DASHBOARD_WIDGETS.find((candidate) => candidate.id === widgetId);
  const target = DASHBOARD_WIDGETS.find((candidate) => candidate.id === targetId);
  if (!widget || !target || widget.area !== target.area) return profile;
  const orderedIds = profile.orderedIds.filter((id) => id !== widgetId);
  const targetIndex = orderedIds.indexOf(targetId);
  orderedIds.splice(targetIndex, 0, widgetId);
  return { ...profile, orderedIds };
};

export const reorderDashboardWidget = (
  preferences: DashboardPreferences,
  widgetId: DashboardWidgetId,
  targetId: DashboardWidgetId,
  device: DashboardDevice = 'desktop',
): DashboardPreferences => updateProfile(
  preferences,
  device,
  (profile) => reorderDashboardWidgetInProfile(profile, widgetId, targetId),
);

export const setDashboardWidgetVisibility = (
  preferences: DashboardPreferences,
  widgetId: DashboardWidgetId,
  visible: boolean,
  device: DashboardDevice,
): DashboardPreferences => updateProfile(preferences, device, (profile) => ({
  ...profile,
  hiddenIds: visible
    ? profile.hiddenIds.filter((id) => id !== widgetId)
    : Array.from(new Set([...profile.hiddenIds, widgetId])),
}));

export const setDashboardWidgetSize = (
  preferences: DashboardPreferences,
  widgetId: DashboardWidgetId,
  size: DashboardWidgetSize,
  device: DashboardDevice,
): DashboardPreferences => updateProfile(preferences, device, (profile) => {
  const widget = DASHBOARD_WIDGETS.find((candidate) => candidate.id === widgetId);
  if (!widget?.sizes.includes(size)) return profile;
  return { ...profile, sizes: { ...profile.sizes, [widgetId]: size } };
});

const readPreferences = () => {
  if (typeof window === 'undefined') return DEFAULT_DASHBOARD_PREFERENCES;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeDashboardPreferences(JSON.parse(raw)) : DEFAULT_DASHBOARD_PREFERENCES;
  } catch {
    return DEFAULT_DASHBOARD_PREFERENCES;
  }
};

const writePreferences = (preferences: DashboardPreferences) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    window.dispatchEvent(new Event(DASHBOARD_EVENT));
  } catch {
    /* localStorage can be disabled; in-memory preferences remain usable. */
  }
};

export const useDashboardPreferences = () => {
  const [preferences, setPreferencesState] = useState(DEFAULT_DASHBOARD_PREFERENCES);
  const [device, setDevice] = useState<DashboardDevice>('desktop');

  useEffect(() => {
    const query = window.matchMedia('(max-width: 767px)');
    const syncDevice = () => setDevice(query.matches ? 'mobile' : 'desktop');
    syncDevice();
    query.addEventListener('change', syncDevice);
    return () => query.removeEventListener('change', syncDevice);
  }, []);

  useEffect(() => {
    const local = readPreferences();
    setPreferencesState(local);
    let cancelled = false;
    (async () => {
      try {
        const user = await usersApi.me();
        if (cancelled) return;
        if (user.dashboard_preferences) {
          const remote = normalizeDashboardPreferences(user.dashboard_preferences);
          writePreferences(remote);
          setPreferencesState(remote);
        } else {
          await userPrefsApi.updateMe({ dashboard_preferences: local });
        }
      } catch (caught) {
        if (!(caught instanceof AuthRequiredError)) console.warn('Failed to sync dashboard preferences:', caught);
      }
    })();
    const sync = () => setPreferencesState(readPreferences());
    window.addEventListener(DASHBOARD_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      cancelled = true;
      window.removeEventListener(DASHBOARD_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const setPreferences = useCallback((next: SetStateAction<DashboardPreferences>) => {
    setPreferencesState((current) => {
      const resolved = normalizeDashboardPreferences(
        typeof next === 'function' ? (next as (value: DashboardPreferences) => DashboardPreferences)(current) : next,
      );
      writePreferences(resolved);
      void userPrefsApi.updateMe({ dashboard_preferences: resolved }).catch((caught) => {
        if (!(caught instanceof AuthRequiredError)) console.warn('Failed to save dashboard preferences:', caught);
      });
      return resolved;
    });
  }, []);

  const resetPreferences = useCallback(() => setPreferences(DEFAULT_DASHBOARD_PREFERENCES), [setPreferences]);
  const derived = useMemo(() => deriveDashboardWidgets(preferences, device), [preferences, device]);
  return { preferences, setPreferences, resetPreferences, device, ...derived };
};
