import { describe, expect, it } from 'vitest';
import {
  deriveDashboardWidgets,
  moveDashboardWidget,
  normalizeDashboardPreferences,
  reorderDashboardWidget,
  setDashboardWidgetSize,
  setDashboardWidgetVisibility,
} from './dashboardPreferences';

describe('dashboard preferences', () => {
  it('migrates legacy data and restores newly registered widgets', () => {
    const preferences = normalizeDashboardPreferences({
      orderedIds: ['calendar', 'invalid', 'today', 'calendar'],
      hiddenIds: ['activity', 'missing'],
    });
    expect(preferences.version).toBe(2);
    expect(preferences.desktop.orderedIds.slice(0, 2)).toEqual(['calendar', 'today']);
    expect(preferences.desktop.orderedIds).not.toContain('active-goals');
    expect(preferences.desktop.hiddenIds).toEqual(['activity']);
    expect(preferences.mobile.orderedIds).toEqual(preferences.desktop.orderedIds);
  });

  it('keeps desktop and mobile layouts independent', () => {
    const preferences = normalizeDashboardPreferences({
      version: 2,
      desktop: { orderedIds: ['today', 'activity'], hiddenIds: ['inbox'] },
      mobile: { orderedIds: ['inbox', 'today'], hiddenIds: ['activity'] },
    });
    expect(deriveDashboardWidgets(preferences, 'desktop').mainWidgets.slice(0, 2).map((widget) => widget.id)).toEqual(['today', 'activity']);
    expect(deriveDashboardWidgets(preferences, 'mobile').mainWidgets.slice(0, 2).map((widget) => widget.id)).toEqual(['inbox', 'today']);
  });

  it('derives visible widgets with persisted sizes in fixed responsive areas', () => {
    let preferences = normalizeDashboardPreferences({
      orderedIds: ['quick-actions', 'calendar', 'activity', 'today'],
      hiddenIds: ['calendar'],
    });
    preferences = setDashboardWidgetSize(preferences, 'activity', 'wide', 'desktop');
    const derived = deriveDashboardWidgets(preferences, 'desktop');
    expect(derived.sidebarWidgets.map((widget) => widget.id)).toEqual(['quick-actions']);
    expect(derived.mainWidgets.map((widget) => widget.id).slice(0, 2)).toEqual(['activity', 'today']);
    expect(derived.mainWidgets[0].size).toBe('wide');
  });

  it('moves widgets only inside their own area and active preset', () => {
    const preferences = normalizeDashboardPreferences({ orderedIds: ['today', 'activity', 'calendar', 'quick-actions'] });
    const moved = moveDashboardWidget(preferences, 'activity', -1, 'desktop');
    expect(moved.desktop.orderedIds.indexOf('activity')).toBeLessThan(moved.desktop.orderedIds.indexOf('today'));
    expect(moved.mobile.orderedIds).toEqual(preferences.mobile.orderedIds);
    expect(moveDashboardWidget(preferences, 'calendar', -1, 'desktop')).toEqual(preferences);
  });

  it('supports drag reorder and visibility changes without cross-area moves', () => {
    let preferences = normalizeDashboardPreferences({ orderedIds: ['today', 'activity', 'inbox', 'calendar'] });
    preferences = reorderDashboardWidget(preferences, 'inbox', 'today', 'desktop');
    expect(preferences.desktop.orderedIds.indexOf('inbox')).toBeLessThan(preferences.desktop.orderedIds.indexOf('today'));
    expect(reorderDashboardWidget(preferences, 'calendar', 'today', 'desktop')).toEqual(preferences);
    preferences = setDashboardWidgetVisibility(preferences, 'inbox', false, 'desktop');
    expect(deriveDashboardWidgets(preferences, 'desktop').mainWidgets.some((widget) => widget.id === 'inbox')).toBe(false);
    preferences = setDashboardWidgetVisibility(preferences, 'inbox', true, 'desktop');
    expect(deriveDashboardWidgets(preferences, 'desktop').mainWidgets.some((widget) => widget.id === 'inbox')).toBe(true);
  });

  it('rejects sizes unsupported by a widget', () => {
    const preferences = normalizeDashboardPreferences({});
    expect(setDashboardWidgetSize(preferences, 'today', 'compact', 'desktop')).toEqual(preferences);
  });
});
