'use client';

import React, { useEffect, useState } from 'react';
import {
 AnimalId,
 getAnimalConfig,
 JourneyAnimationState,
} from '@/lib/journeyAnimals';

interface AnimalSpriteProps {
 animalId: AnimalId;
 state: JourneyAnimationState;
 facingLeft?: boolean;
 reducedMotion?: boolean;
}

export const AnimalSprite: React.FC<AnimalSpriteProps> = ({
 animalId,
 state,
 facingLeft = false,
 reducedMotion = false,
}) => {
 const animal = getAnimalConfig(animalId);
 const animation = animal.animations[state];
 const direction = (facingLeft ? -1 : 1) * (animal.mirrorX ? -1 : 1);
 const [frame, setFrame] = useState(animation.frameStart);

 useEffect(() => {
 setFrame(animation.frameStart);
 if (reducedMotion) return;

 const frameDuration = (animation.durationSeconds * 1000) / animation.frameCount;
 const timer = window.setInterval(() => {
 setFrame((currentFrame) => {
 const nextFrame = currentFrame + 1;
 return nextFrame >= animation.frameStart + animation.frameCount
 ? animation.frameStart
 : nextFrame;
 });
 }, frameDuration);

 return () => window.clearInterval(timer);
 }, [animation.durationSeconds, animation.frameCount, animation.frameStart, reducedMotion]);

 const viewBoxX = frame * animal.frameWidth;
 const viewBoxY = animation.row * animal.frameHeight;
 const scaleX = direction * animal.scaleX * animal.scale;
 const scaleY = animal.scaleY * animal.scale;

 return (
 <g
 role="img"
 aria-label={`${animal.name} ${state}`}
 transform={`translate(${animal.offsetX} ${animal.offsetY}) scale(${scaleX} ${scaleY})`}
 style={{
 filter: 'drop-shadow(1px 0 0 var(--viz-character-outline, white)) drop-shadow(-1px 0 0 var(--viz-character-outline, white)) drop-shadow(0 1px 0 var(--viz-character-outline, white)) drop-shadow(0 -1px 0 var(--viz-character-outline, white)) drop-shadow(0 7px 7px rgba(0, 0, 0, 0.28))',
 }}
 >
 <svg
 x={-animal.frameWidth / 2}
 y={-animal.frameHeight / 2}
 width={animal.frameWidth}
 height={animal.frameHeight}
 viewBox={`${viewBoxX} ${viewBoxY} ${animal.frameWidth} ${animal.frameHeight}`}
 overflow="hidden"
 aria-hidden="true"
 >
 <image
 href={`/${animal.assetPath}`}
 width={animal.frameWidth * animal.sheetColumns}
 height={animal.frameHeight * animal.sheetRows}
 preserveAspectRatio="none"
 style={{ imageRendering: 'pixelated' }}
 />
 </svg>
 </g>
 );
};
