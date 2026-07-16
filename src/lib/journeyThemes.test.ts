import { describe, expect, it } from 'vitest';
import { JOURNEY_THEME_IDS, JOURNEY_THEMES, getJourneyTheme } from './journeyThemes';

describe('journey theme registry', () => {
 it('contains exactly the first six supported themes', () => {
 expect(JOURNEY_THEME_IDS).toEqual(['mountain', 'world-tree', 'cosmic', 'volcano', 'ocean', 'castle']);
 });

 it('keeps assets and route data in every theme config', () => {
 for (const theme of Object.values(JOURNEY_THEMES)) {
 expect(theme.previewUrl).toBe(`/themes/${theme.id}/preview.webp`);
 expect(theme.backgroundUrl).toBe(`/themes/${theme.id}/background.webp`);
 expect(theme.route.length).toBeGreaterThanOrEqual(6);
 expect(theme.milestonePositions.length).toBe(theme.route.length - 2);
 expect(theme.environmentKind).not.toBe('asset');
 }
 });

 it('falls back to mountain and keeps ocean as the descending journey', () => {
 expect(getJourneyTheme().id).toBe('mountain');
 expect(JOURNEY_THEMES.ocean.direction).toBe('down');
 expect(JOURNEY_THEMES.ocean.route[0].y).toBeLessThan(JOURNEY_THEMES.ocean.route.at(-1)!.y);
 });
});
