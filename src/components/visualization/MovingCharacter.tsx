'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, useAnimationControls, useReducedMotion } from 'framer-motion';
import { AnimalId, getAnimalConfig, JourneyAnimationState } from '@/lib/journeyAnimals';
import { buildJourneyWaypoints, journeyDurationSeconds, JourneyCoordinate } from '@/lib/journeyMotion';
import { AnimalSprite } from './AnimalSprite';

interface MovingCharacterProps {
 point: JourneyCoordinate;
 startPoint: JourneyCoordinate;
 replayKey: number;
 forceReducedMotion?: boolean;
 animalId: AnimalId;
}

export const MovingCharacter: React.FC<MovingCharacterProps> = ({
 point,
 startPoint,
 replayKey,
 forceReducedMotion = false,
 animalId,
}) => {
 const controls = useAnimationControls();
 const systemReducedMotion = useReducedMotion();
 const reducedMotion = forceReducedMotion || Boolean(systemReducedMotion);
 const previousPoint = useRef(startPoint);
 const previousReplay = useRef(replayKey);
 const mounted = useRef(false);
 const [state, setState] = useState<JourneyAnimationState>('idle');
 const [facingLeft, setFacingLeft] = useState(false);
 const animal = getAnimalConfig(animalId);

 useEffect(() => {
 let cancelled = false;
 const replaying = previousReplay.current !== replayKey;
 const from = replaying ? startPoint : previousPoint.current;
 const to = point;
 const stationary = Math.abs(from.x - to.x) < 0.5 && Math.abs(from.y - to.y) < 0.5;
 previousReplay.current = replayKey;
 previousPoint.current = to;
 setFacingLeft(to.x < from.x);

 if (!mounted.current || reducedMotion || stationary) {
 mounted.current = true;
 controls.set({ x: to.x, y: to.y });
 setState('idle');
 return;
 }

 const waypoints = buildJourneyWaypoints(from, to, animal.movementType);
 const duration = journeyDurationSeconds(from, to, animal.movementType, replaying);
 setState('moving');
 void controls.start({
 x: waypoints.map((waypoint) => waypoint.x),
 y: waypoints.map((waypoint) => waypoint.y),
 transition: {
 duration,
 ease: 'easeInOut',
 times: waypoints.map((_, index) => index / (waypoints.length - 1)),
 },
 }).then(() => {
 if (!cancelled) setState('arrived');
 });

 return () => {
 cancelled = true;
 controls.stop();
 };
 }, [animal.movementType, controls, point.x, point.y, reducedMotion, replayKey, startPoint]);

 return (
 <motion.g
 initial={{ x: point.x, y: point.y }}
 animate={controls}
 aria-label={`${animal.name} ${state === 'moving' ? 'moving toward current progress' : 'at current progress'}`}
 >
 <foreignObject x={-48} y={-48} width={96} height={96} pointerEvents="none">
 <div style={{ display: 'grid', width: 96, height: 96, placeItems: 'center' }}>
 <AnimalSprite animalId={animalId} state={state} facingLeft={facingLeft} reducedMotion={reducedMotion} />
 </div>
 </foreignObject>
 </motion.g>
 );
};
