import { describe, expect, it } from 'vitest';
import {
  generateProceduralMountain,
  generateProceduralThemeEnvironment,
  mountainGeometryIsBounded,
  proceduralThemeGeometryIsBounded,
} from './journeyEnvironments';

describe('procedural journey environments', () => {
  it('generates a stable mountain for the same seed', () => {
    expect(generateProceduralMountain(42)).toEqual(generateProceduralMountain(42));
  });

  it('varies the mountain silhouette between goals', () => {
    expect(generateProceduralMountain(42).mountain.points).not.toEqual(
      generateProceduralMountain(84).mountain.points,
    );
  });

  it('keeps all mountain geometry inside the shared viewbox', () => {
    expect(mountainGeometryIsBounded(generateProceduralMountain(4294967295))).toBe(true);
  });

  it('keeps the environment low-detail and readable', () => {
    const mountain = generateProceduralMountain(17);
    expect(mountain.clouds).toHaveLength(5);
    expect(mountain.distantPeaks).toHaveLength(2);
    expect(mountain.facets.length).toBeLessThanOrEqual(4);
    expect(mountain.mountain.points.length).toBeLessThanOrEqual(16);
  });

  it('aligns the mountain summit with the journey destination', () => {
    const destination = { x: 648, y: 76 };
    const mountain = generateProceduralMountain(17, {
      destination,
      profile: { milestoneCount: 8, taskCount: 24, effort: 36 },
    });

    expect(mountain.mountain.points).toContainEqual(destination);
    expect(mountain.snow.points).toContainEqual(destination);
  });

  it('changes the mountain silhouette for a longer journey', () => {
    const shortJourney = generateProceduralMountain(31, {
      profile: { milestoneCount: 2, taskCount: 4, effort: 5 },
    });
    const longJourney = generateProceduralMountain(31, {
      profile: { milestoneCount: 10, taskCount: 30, effort: 45 },
    });

    expect(longJourney.mountain.points).not.toEqual(shortJourney.mountain.points);
    expect(longJourney.snow.points).not.toEqual(shortJourney.snow.points);
  });
});

describe('procedural theme environments', () => {
  const themeIds = ['world-tree', 'cosmic', 'volcano', 'ocean', 'castle'] as const;

  it.each(themeIds)('generates stable bounded %s geometry', (themeId) => {
    [1, 12345, 4294967295].forEach((seed) => {
      const scene = generateProceduralThemeEnvironment(themeId, seed);
      expect(scene).toEqual(generateProceduralThemeEnvironment(themeId, seed));
      expect(scene.themeId).toBe(themeId);
      expect(scene.shapes.length).toBeGreaterThan(5);
      expect(scene.shapes.length).toBeLessThan(50);
      expect(proceduralThemeGeometryIsBounded(scene)).toBe(true);
    });
  });

  it('keeps the five visual worlds structurally distinct', () => {
    const signatures = themeIds.map((themeId) => {
      const scene = generateProceduralThemeEnvironment(themeId, 88);
      return `${scene.skyTop}:${scene.shapes.map((shape) => shape.kind).join(',')}`;
    });
    expect(new Set(signatures).size).toBe(themeIds.length);
  });

  it('aligns the volcanic crater with the route destination', () => {
    const destination = { x: 635, y: 94 };
    const scene = generateProceduralThemeEnvironment('volcano', 55, {
      destination,
      profile: { milestoneCount: 7, taskCount: 21, effort: 32 },
    });
    const crater = scene.shapes.find((shape) => shape.id === 'crater-core');

    expect(crater).toMatchObject({ kind: 'rect' });
    if (crater?.kind === 'rect') {
      expect(crater.x + (crater.width / 2)).toBeCloseTo(destination.x, 0);
    }
    expect(scene.shapes.filter((shape) => shape.id.startsWith('lava-')).length).toBeGreaterThanOrEqual(3);
  });
});
