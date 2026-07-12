'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
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

interface CharacterMotion {
 key: string;
 values: string;
 duration: number;
}

export const MovingCharacter: React.FC<MovingCharacterProps> = ({
 point,
 startPoint,
 replayKey,
 forceReducedMotion = false,
 animalId,
}) => {
 const systemReducedMotion = useReducedMotion();
 const reducedMotion = forceReducedMotion || Boolean(systemReducedMotion);
 const previousPoint = useRef(startPoint);
 const previousReplay = useRef(replayKey);
 const mounted = useRef(false);
 const [state, setState] = useState<JourneyAnimationState>('idle');
 const [facingLeft, setFacingLeft] = useState(false);
 const [characterMotion, setCharacterMotion] = useState<CharacterMotion | null>(null);
 const animal = getAnimalConfig(animalId);

 useEffect(() => {
 const replaying = previousReplay.current !== replayKey;
 const from = replaying ? startPoint : previousPoint.current;
 const to = point;
 const stationary = Math.abs(from.x - to.x) < 0.5 && Math.abs(from.y - to.y) < 0.5;
 previousReplay.current = replayKey;
 previousPoint.current = to;
 setFacingLeft(to.x < from.x);

 if (!mounted.current || reducedMotion || stationary) {
 mounted.current = true;
 setCharacterMotion(null);
 setState('idle');
 return;
 }

 const waypoints = buildJourneyWaypoints(from, to, animal.movementType);
 const duration = journeyDurationSeconds(from, to, animal.movementType, replaying);
 setCharacterMotion({
 key: `${replayKey}:${from.x}:${from.y}:${to.x}:${to.y}`,
 values: waypoints.map((waypoint) => `${waypoint.x - to.x} ${waypoint.y - to.y}`).join(';'),
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
 }, [animal.movementType, point.x, point.y, reducedMotion, replayKey, startPoint]);

 return (
 <g
 transform={`translate(${point.x} ${point.y})`}
 aria-label={`${animal.name} ${state === 'moving' ? 'moving toward current progress' : 'at current progress'}`}
 >
 <g>
 {characterMotion && (
 <animateTransform
 key={characterMotion.key}
 attributeName="transform"
 type="translate"
 values={characterMotion.values}
 dur={`${characterMotion.duration}s`}
 begin="0s"
 fill="freeze"
 />
 )}
 <AnimalSprite animalId={animalId} state={state} facingLeft={facingLeft} reducedMotion={reducedMotion} />
 </g>
 </g>
 );
};
