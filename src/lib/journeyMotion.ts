import { JourneyMovementType } from './journeyAnimals';

export interface JourneyCoordinate {
 x: number;
 y: number;
}

const distanceBetween = (from: JourneyCoordinate, to: JourneyCoordinate) =>
 Math.hypot(to.x - from.x, to.y - from.y);

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

 return [from, midpoint, to];
};

export const journeyDurationSeconds = (
 from: JourneyCoordinate,
 to: JourneyCoordinate,
 movementType: JourneyMovementType,
 replaying = false,
) => {
 if (replaying) return movementType === 'walking' ? 3.1 : 2.6;
 const distance = distanceBetween(from, to);
 const speed = movementType === 'flying' ? 390 : movementType === 'jumping' ? 310 : 245;
 return Math.min(2.4, Math.max(0.75, distance / speed));
};
