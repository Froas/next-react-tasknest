import { JourneyMovementType } from './journeyAnimals';

export interface JourneyCoordinate {
 x: number;
 y: number;
}

const distanceBetween = (from: JourneyCoordinate, to: JourneyCoordinate) =>
 Math.hypot(to.x - from.x, to.y - from.y);

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const journeyPathLength = (points: JourneyCoordinate[]) => points
 .slice(1)
 .reduce((total, point, index) => total + distanceBetween(points[index], point), 0);

export const journeyWaypointTimes = (points: JourneyCoordinate[]): number[] => {
 if (points.length <= 1) return [0];
 const segmentLengths = points.slice(1).map((point, index) => distanceBetween(points[index], point));
 const total = segmentLengths.reduce((sum, length) => sum + length, 0);
 if (total === 0) return points.map((_, index) => index / (points.length - 1));

 let travelled = 0;
 return points.map((_, index) => {
  if (index === 0) return 0;
  travelled += segmentLengths[index - 1];
  return travelled / total;
 });
};

const samplePolyline = (route: JourneyCoordinate[], ratio: number): JourneyCoordinate => {
 if (route.length === 0) return { x: 0, y: 0 };
 if (route.length === 1) return route[0];
 const normalizedRatio = clamp(ratio, 0, 1);
 if (normalizedRatio === 0) return route[0];
 if (normalizedRatio === 1) return route.at(-1) ?? route[0];
 const lengths = route.slice(1).map((point, index) => distanceBetween(route[index], point));
 const total = lengths.reduce((sum, length) => sum + length, 0);
 const target = normalizedRatio * total;
 let consumed = 0;
 for (let index = 0; index < lengths.length; index += 1) {
 const length = lengths[index];
 if (target <= consumed + length || index === lengths.length - 1) {
 const local = length === 0 ? 0 : (target - consumed) / length;
 return {
 x: route[index].x + ((route[index + 1].x - route[index].x) * local),
 y: route[index].y + ((route[index + 1].y - route[index].y) * local),
 };
 }
 consumed += length;
 }
 return route.at(-1) ?? { x: 0, y: 0 };
};

const slicePolyline = (
 route: JourneyCoordinate[],
 fromRatio: number,
 toRatio: number,
): JourneyCoordinate[] => {
 if (route.length < 2) return route.length === 1 ? [route[0]] : [];
 const lengths = route.slice(1).map((point, index) => distanceBetween(route[index], point));
 const total = lengths.reduce((sum, length) => sum + length, 0);
 if (total === 0) return [route[0]];

 const fromDistance = clamp(fromRatio, 0, 1) * total;
 const toDistance = clamp(toRatio, 0, 1) * total;
 const lowerDistance = Math.min(fromDistance, toDistance);
 const upperDistance = Math.max(fromDistance, toDistance);
 const points = [samplePolyline(route, fromRatio)];
 let consumed = 0;

 lengths.forEach((length, index) => {
  consumed += length;
  if (consumed > lowerDistance && consumed < upperDistance) points.push(route[index + 1]);
 });

 points.push(samplePolyline(route, toRatio));
 return fromDistance <= toDistance ? points : points.reverse();
};

export const buildJourneyWaypoints = (
 from: JourneyCoordinate,
 to: JourneyCoordinate,
 movementType: JourneyMovementType,
): JourneyCoordinate[] => {
 const distance = distanceBetween(from, to);
 const midpoint = {
 x: (from.x + to.x) / 2,
 y: (from.y + to.y) / 2,
 };

 if (movementType === 'flying') {
 return [
 from,
 { ...midpoint, y: Math.min(from.y, to.y) - Math.max(34, distance * 0.08) },
 to,
 ];
 }

 if (movementType === 'jumping') {
 return [
 from,
 { ...midpoint, y: midpoint.y - Math.max(24, distance * 0.12) },
 to,
 ];
 }

 if (movementType === 'swimming') {
 const wave = Math.max(18, distance * 0.045);
 return [
 from,
 { x: from.x + ((to.x - from.x) * 0.33), y: from.y + ((to.y - from.y) * 0.33) - wave },
 { x: from.x + ((to.x - from.x) * 0.66), y: from.y + ((to.y - from.y) * 0.66) + wave },
 to,
 ];
 }

 return [from, midpoint, to];
};

export const buildJourneyRouteWaypoints = (
 route: JourneyCoordinate[],
 fromRatio: number,
 toRatio: number,
 movementType: JourneyMovementType,
): JourneyCoordinate[] => {
 const from = samplePolyline(route, fromRatio);
 const to = samplePolyline(route, toRatio);
 if (movementType === 'flying') return buildJourneyWaypoints(from, to, movementType);

 const distance = distanceBetween(from, to);
 const sampleCount = Math.max(2, Math.min(9, Math.ceil(distance / 90)));
 const points = Array.from({ length: sampleCount + 1 }, (_, index) => (
 samplePolyline(route, fromRatio + ((toRatio - fromRatio) * (index / sampleCount)))
 ));

 if (movementType === 'swimming') {
 const wave = Math.max(8, Math.min(22, distance * 0.035));
 return points.map((point, index) => {
 if (index === 0 || index === points.length - 1) return point;
 return { ...point, y: point.y + (index % 2 === 0 ? wave : -wave) };
 });
 }

 if (movementType === 'jumping') {
 return points.map((point, index) => {
 if (index === 0 || index === points.length - 1) return point;
 return { ...point, y: point.y - (index % 2 === 0 ? 10 : 24) };
 });
 }

 return points;
};

export const buildJourneyReplayWaypoints = (
 route: JourneyCoordinate[],
 toRatio: number,
): JourneyCoordinate[] => slicePolyline(route, 0, toRatio);

export const journeyDurationSeconds = (
 from: JourneyCoordinate,
 to: JourneyCoordinate,
 movementType: JourneyMovementType,
 replaying = false,
 travelDistance = distanceBetween(from, to),
 animationCycleSeconds?: number,
) => {
 if (replaying) {
 const replaySpeed = movementType === 'flying'
  ? 125
  : movementType === 'jumping'
   ? 110
   : movementType === 'swimming'
    ? 100
    : 90;
 const baseDuration = clamp(travelDistance / replaySpeed, 4, 12);
 if (!animationCycleSeconds) return baseDuration;
 return Math.ceil(baseDuration / animationCycleSeconds) * animationCycleSeconds;
 }
 const distance = distanceBetween(from, to);
 const speed = movementType === 'flying' ? 390 : movementType === 'jumping' ? 310 : movementType === 'swimming' ? 285 : 245;
 return Math.min(2.4, Math.max(0.75, distance / speed));
};
