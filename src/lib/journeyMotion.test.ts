import { describe, expect, it } from 'vitest';
import {
 buildJourneyReplayWaypoints,
 buildJourneyRouteWaypoints,
 buildJourneyWaypoints,
 journeyDurationSeconds,
 journeyPathLength,
 journeyWaypointTimes,
} from './journeyMotion';

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
 expect(journeyDurationSeconds({ x: 0, y: 0 }, { x: 10, y: 10 }, 'flying', true)).toBe(4);
 expect(journeyDurationSeconds({ x: 0, y: 0 }, { x: 500, y: 0 }, 'walking')).toBeLessThanOrEqual(2.4);
 });

 it('slows replay down for longer routes and ends on a full animation cycle', () => {
 const route = [{ x: 0, y: 0 }, { x: 0, y: 500 }, { x: 500, y: 500 }];
 const length = journeyPathLength(route);
 const duration = journeyDurationSeconds(route[0], route[2], 'flying', true, length, 0.52);
 expect(duration).toBeGreaterThan(8);
 expect(duration / 0.52).toBeCloseTo(Math.round(duration / 0.52));
 });

 it('uses distance-based keyframe timing for an even route speed', () => {
 const times = journeyWaypointTimes([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 100, y: 0 }]);
 expect(times).toEqual([0, 0.1, 1]);
 });

 it('gives swimming characters a gentle alternating wave', () => {
 const swimming = buildJourneyWaypoints({ x: 0, y: 100 }, { x: 300, y: 300 }, 'swimming');
 expect(swimming).toHaveLength(4);
 expect(swimming[1].y).toBeLessThan(100 + ((300 - 100) * 0.33));
 expect(swimming[2].y).toBeGreaterThan(100 + ((300 - 100) * 0.66));
 });

 it('keeps walking characters on a curved generated route', () => {
 const route = [{ x: 0, y: 100 }, { x: 50, y: 20 }, { x: 100, y: 100 }];
 const walking = buildJourneyRouteWaypoints(route, 0, 1, 'walking');
 expect(walking.length).toBeGreaterThan(2);
 expect(walking.some((point) => point.y < 50)).toBe(true);
 expect(walking[0]).toEqual(route[0]);
 expect(walking.at(-1)).toEqual(route.at(-1));
 });

 it('lets flying characters use an aerial arc instead of terrain samples', () => {
 const route = [{ x: 0, y: 100 }, { x: 50, y: 160 }, { x: 100, y: 100 }];
 const flying = buildJourneyRouteWaypoints(route, 0, 1, 'flying');
 expect(flying).toHaveLength(3);
 expect(flying[1].y).toBeLessThan(100);
 });

 it('replays every route turn instead of replacing it with a flying arc', () => {
 const route = [
  { x: 0, y: 100 },
  { x: 40, y: 40 },
  { x: 80, y: 120 },
  { x: 120, y: 20 },
 ];
 const replay = buildJourneyReplayWaypoints(route, 1);
 expect(replay).toEqual(route);
 });

 it('stops replay at the current route ratio', () => {
 const route = [{ x: 0, y: 100 }, { x: 50, y: 0 }, { x: 100, y: 100 }];
 const replay = buildJourneyReplayWaypoints(route, 0.5);
 expect(replay).toEqual([{ x: 0, y: 100 }, { x: 50, y: 0 }]);
 });
});
