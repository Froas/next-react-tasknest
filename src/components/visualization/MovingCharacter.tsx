'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { AnimalId, getAnimalConfig, JourneyAnimationState } from '@/lib/journeyAnimals';
import {
 buildJourneyReplayWaypoints,
 buildJourneyRouteWaypoints,
 buildJourneyWaypoints,
 journeyDurationSeconds,
 journeyPathLength,
 journeyWaypointTimes,
 JourneyCoordinate,
} from '@/lib/journeyMotion';
import { AnimalSprite } from './AnimalSprite';

interface MovingCharacterProps {
 point: JourneyCoordinate;
 startPoint: JourneyCoordinate;
 route: JourneyCoordinate[];
 routeRatio: number;
 replayKey: number;
 forceReducedMotion?: boolean;
 animalId: AnimalId;
}

interface CharacterMotion {
 key: string;
 x: number[];
 y: number[];
 times: number[];
 duration: number;
}

export const MovingCharacter: React.FC<MovingCharacterProps> = ({
 point,
 startPoint,
 route,
 routeRatio,
 replayKey,
 forceReducedMotion = false,
 animalId,
}) => {
 const systemReducedMotion = useReducedMotion();
 const reducedMotion = forceReducedMotion || Boolean(systemReducedMotion);
 const previousPoint = useRef(startPoint);
 const previousReplay = useRef(replayKey);
 const previousRouteRatio = useRef(0);
 const previousRoute = useRef(route);
 const mounted = useRef(false);
 const [state, setState] = useState<JourneyAnimationState>('idle');
 const [facingLeft, setFacingLeft] = useState(false);
 const [characterMotion, setCharacterMotion] = useState<CharacterMotion | null>(null);
 const animal = getAnimalConfig(animalId);

 useEffect(() => {
 const replaying = previousReplay.current !== replayKey;
 const from = replaying ? startPoint : previousPoint.current;
 const fromRouteRatio = replaying ? 0 : previousRouteRatio.current;
 const routeChanged = previousRoute.current !== route;
 const to = point;
 const stationary = Math.abs(from.x - to.x) < 0.5 && Math.abs(from.y - to.y) < 0.5;
 previousReplay.current = replayKey;
 previousPoint.current = to;
 previousRouteRatio.current = routeRatio;
 previousRoute.current = route;
 setFacingLeft(to.x < from.x);

 if (!mounted.current || reducedMotion || stationary) {
 mounted.current = true;
 setCharacterMotion(null);
 setState('idle');
 return;
 }

 const waypoints = replaying
 ? buildJourneyReplayWaypoints(route, routeRatio)
 : routeChanged
  ? buildJourneyWaypoints(from, to, animal.movementType)
  : buildJourneyRouteWaypoints(route, fromRouteRatio, routeRatio, animal.movementType);
 const duration = journeyDurationSeconds(
 from,
 to,
 animal.movementType,
 replaying,
 journeyPathLength(waypoints),
 animal.animations.moving.durationSeconds,
 );
 setCharacterMotion({
 key: `${replayKey}:${from.x}:${from.y}:${to.x}:${to.y}`,
 x: waypoints.map((waypoint) => waypoint.x),
 y: waypoints.map((waypoint) => waypoint.y),
 times: journeyWaypointTimes(waypoints),
 duration,
 });
 setState('moving');
 const arrivalTimer = window.setTimeout(() => {
 setCharacterMotion(null);
 setState('arrived');
 }, duration * 1000);

 return () => {
 window.clearTimeout(arrivalTimer);
 };
 }, [animal.movementType, point.x, point.y, reducedMotion, replayKey, route, routeRatio, startPoint]);

 return (
 <motion.g
 key={characterMotion?.key ?? `${animalId}:stationary`}
 initial={characterMotion
 ? { x: characterMotion.x[0], y: characterMotion.y[0] }
 : { x: point.x, y: point.y }}
 animate={characterMotion
 ? { x: characterMotion.x, y: characterMotion.y }
 : { x: point.x, y: point.y }}
 transition={characterMotion
 ? { duration: characterMotion.duration, ease: 'linear', times: characterMotion.times }
 : { duration: 0 }}
 aria-label={`${animal.name} ${state === 'moving' ? 'moving toward current progress' : 'at current progress'}`}
 >
 <AnimalSprite animalId={animalId} state={state} facingLeft={facingLeft} reducedMotion={reducedMotion} />
 </motion.g>
 );
};
