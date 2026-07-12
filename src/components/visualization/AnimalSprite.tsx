'use client';

import React from 'react';
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
 const startX = animation.frameStart * animal.frameWidth;
 const endX = (animation.frameStart + animation.frameCount) * animal.frameWidth;
 const rowY = animation.row * animal.frameHeight;

 return (
 <span
 role="img"
 aria-label={`${animal.name} ${state}`}
 className={`${styles.sprite} ${reducedMotion ? styles.reducedMotion : ''}`}
 style={{
 '--sprite-url': `url("/${animal.assetPath}")`,
 '--frame-width': `${animal.frameWidth}px`,
 '--frame-height': `${animal.frameHeight}px`,
 '--sheet-width': `${animal.frameWidth * animal.sheetColumns}px`,
 '--sheet-height': `${animal.frameHeight * animal.sheetRows}px`,
 '--frame-count': animation.frameCount,
 '--animation-speed': `${animation.durationSeconds}s`,
 '--sprite-start-x': `${-startX}px`,
 '--sprite-end-x': `${-endX}px`,
 '--sprite-row-y': `${-rowY}px`,
 '--sprite-scale': animal.scale,
 '--sprite-scale-x': facingLeft ? -animal.scaleX : animal.scaleX,
 '--sprite-scale-y': animal.scaleY,
 '--sprite-offset-x': `${animal.offsetX}px`,
 '--sprite-offset-y': `${animal.offsetY}px`,
 } as React.CSSProperties}
 />
 );
};
