import { describe, expect, it } from 'vitest';
import { buildJourneyWaypoints, journeyDurationSeconds } from './journeyMotion';

describe('journey motion', () => {
 it('creates an aerial arc without depending on DOM or CSS', () => {
 const points = buildJourneyWaypoints({ x: 20, y: 100 }, { x: 220, y: 40 }, 'flying');
 expect(points).toHaveLength(3);
 expect(points[0]).toEqual({ x: 20, y: 100 });
 expect(points[2]).toEqual({ x: 220, y: 40 });
 expect(points[1].y).toBeLessThan(40);
 });

 it('keeps walking routes on the direct trail and jumping routes arced', () => {
 const walking = buildJourneyWaypoints({ x: 0, y: 100 }, { x: 100, y: 60 }, 'walking');
 const jumping = buildJourneyWaypoints({ x: 0, y: 100 }, { x: 100, y: 60 }, 'jumping');
 expect(walking[1]).toEqual({ x: 50, y: 80 });
 expect(jumping[1].y).toBeLessThan(walking[1].y);
 });

 it('uses a stable longer duration for replay', () => {
 expect(journeyDurationSeconds({ x: 0, y: 0 }, { x: 10, y: 10 }, 'flying', true)).toBe(2.6);
 expect(journeyDurationSeconds({ x: 0, y: 0 }, { x: 500, y: 0 }, 'walking')).toBeLessThanOrEqual(2.4);
 });
});
