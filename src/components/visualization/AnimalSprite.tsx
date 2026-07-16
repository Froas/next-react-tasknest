'use client';

import React, { CSSProperties } from 'react';
import {
 AnimalId,
 getAnimalConfig,
 JourneyAnimationState,
} from '@/lib/journeyAnimals';
import styles from './AnimalSprite.module.css';

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
 const scaleX = direction * animal.scaleX * animal.scale;
 const scaleY = animal.scaleY * animal.scale;
 const spriteStyle = {
 '--frame-width': `${animal.frameWidth}px`,
 '--frame-height': `${animal.frameHeight}px`,
 '--sheet-width': `${animal.frameWidth * animal.sheetColumns}px`,
 '--sheet-height': `${animal.frameHeight * animal.sheetRows}px`,
 '--sprite-url': `url(/${animal.assetPath})`,
 '--sprite-start-x': `${-(animation.frameStart * animal.frameWidth)}px`,
 '--sprite-end-x': `${-((animation.frameStart + animation.frameCount) * animal.frameWidth)}px`,
 '--sprite-row-y': `${-(animation.row * animal.frameHeight)}px`,
 '--sprite-offset-x': `${animal.offsetX}px`,
 '--sprite-offset-y': `${animal.offsetY}px`,
 '--sprite-scale-x': String(scaleX),
 '--sprite-scale-y': String(scaleY),
 '--sprite-scale': '1',
 '--animation-speed': `${animation.durationSeconds}s`,
 '--frame-count': String(animation.frameCount),
 } as CSSProperties;

 return (
 <foreignObject
 role="img"
 aria-label={`${animal.name} ${state}`}
 x={-animal.frameWidth / 2}
 y={-animal.frameHeight / 2}
 width={animal.frameWidth}
 height={animal.frameHeight}
 overflow="visible"
 >
 <div
 className={`${styles.sprite}${animal.outlineMode === 'native' ? ` ${styles.nativeOutline}` : ''}${reducedMotion ? ` ${styles.reducedMotion}` : ''}`}
 style={spriteStyle}
 aria-hidden="true"
 />
 </foreignObject>
 );
};
