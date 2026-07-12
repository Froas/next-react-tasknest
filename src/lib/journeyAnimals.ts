export type JourneyMovementType = 'flying' | 'walking' | 'jumping';
export type JourneyAnimationState = 'idle' | 'moving' | 'arrived';
export type AnimalId = 'bat';

export interface AnimalAnimationConfig {
 frameStart: number;
 frameCount: number;
 row: number;
 durationSeconds: number;
}

export interface AnimalConfig {
 id: AnimalId;
 name: string;
 assetPath: string;
 frameWidth: number;
 frameHeight: number;
 sheetColumns: number;
 sheetRows: number;
 movementType: JourneyMovementType;
 mirrorX: boolean;
 scale: number;
 scaleX: number;
 scaleY: number;
 offsetX: number;
 offsetY: number;
 animations: Record<JourneyAnimationState, AnimalAnimationConfig>;
}

export const ANIMALS: Record<AnimalId, AnimalConfig> = {
 bat: {
 id: 'bat',
 name: 'Bat',
 assetPath: 'animals/bat.png',
 frameWidth: 64,
 frameHeight: 64,
 sheetColumns: 7,
 sheetRows: 1,
 movementType: 'flying',
 mirrorX: true,
 scale: 1.08,
 scaleX: 1.2,
 scaleY: 0.9,
 offsetX: 0,
 offsetY: 0,
 animations: {
 idle: { frameStart: 0, frameCount: 7, row: 0, durationSeconds: 0.55 },
 moving: { frameStart: 0, frameCount: 7, row: 0, durationSeconds: 0.4 },
 arrived: { frameStart: 0, frameCount: 7, row: 0, durationSeconds: 0.55 },
 },
 },
};

export const getAnimalConfig = (animalId: AnimalId): AnimalConfig => ANIMALS[animalId];
