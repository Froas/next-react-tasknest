import { describe, expect, it } from 'vitest';
import { deriveNavItems, groupNavItems, normalizeNavPreferences } from './navPreferences';

describe('navPreferences', () => {
 it('normalizes invalid stored preferences and appends missing ids', () => {
 const prefs = normalizeNavPreferences({
 orderedIds: ['calendar', 'bad-id', 'goals'],
 primaryIds: ['calendar', 'missing'],
 hiddenIds: ['goals', 'nope'],
 });

 expect(prefs.orderedIds.slice(0, 2)).toEqual(['calendar', 'goals']);
 expect(prefs.primaryIds).toEqual(['calendar']);
 expect(prefs.hiddenIds).toEqual(['goals']);
 expect(prefs.orderedIds).toContain('today');
 expect(prefs.orderedIds).toContain('dashboard');
 });

 it('includes Visualization in the default top bar', () => {
 const prefs = normalizeNavPreferences({});

 expect(prefs.primaryIds).toContain('visualization');
 });

 it('splits visible items into top bar and more groups', () => {
 const prefs = normalizeNavPreferences({
 orderedIds: ['today', 'dashboard', 'goals', 'calendar', 'todos'],
 primaryIds: ['today', 'dashboard', 'calendar'],
 hiddenIds: ['goals'],
 });
 const derived = deriveNavItems(prefs);

 expect(derived.primaryItems.map((item) => item.id)).toEqual(['today', 'dashboard', 'calendar']);
 expect(derived.moreItems.map((item) => item.id)).not.toContain('goals');
 expect(derived.visibleItems.map((item) => item.id)).not.toContain('goals');
 });

 it('groups only non-primary visible items while preserving their configured order', () => {
 const prefs = normalizeNavPreferences({
 orderedIds: ['todos', 'milestones', 'events', 'tasks', 'graph'],
 primaryIds: ['tasks'],
 hiddenIds: ['events'],
 });
 const groups = groupNavItems(deriveNavItems(prefs).moreItems);

 expect(groups[0]).toMatchObject({ id: 'structure' });
 expect(groups[0].items.map((item) => item.id)).toEqual(['todos', 'milestones', 'goals']);
 expect(groups.flatMap((group) => group.items.map((item) => item.id))).not.toContain('tasks');
 expect(groups.flatMap((group) => group.items.map((item) => item.id))).not.toContain('events');
 });

 it('keeps the old Today dashboard visible when migrating stored navigation', () => {
 const prefs = normalizeNavPreferences({
 orderedIds: ['today', 'goals', 'calendar'],
 primaryIds: ['today', 'goals'],
 hiddenIds: [],
 });

 expect(prefs.orderedIds.slice(0, 3)).toEqual(['today', 'dashboard', 'goals']);
 expect(prefs.primaryIds).toEqual(['today', 'dashboard', 'goals']);
 });
});
