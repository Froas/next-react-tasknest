export type JourneyMovementType = 'flying' | 'walking' | 'jumping' | 'swimming';
export type JourneyAnimationState = 'idle' | 'moving' | 'arrived';
export type AnimalId =
 | 'bat'
 | 'bat-v2'
 | 'eagle'
 | 'snow-leopard'
 | 'owl'
 | 'mountain-goat'
 | 'fox'
 | 'salamander'
 | 'baby-dragon'
 | 'manta-ray'
 | 'sea-turtle';

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
 outlineMode?: 'halo' | 'native';
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
 'bat-v2': {
 id: 'bat-v2',
 name: 'Bat v2',
 assetPath: 'animals/v2/bat-v2.png',
 frameWidth: 32,
 frameHeight: 32,
 sheetColumns: 8,
 sheetRows: 1,
 movementType: 'flying',
 mirrorX: false,
 scale: 2.15,
 scaleX: 1,
 scaleY: 1,
 offsetX: 0,
 offsetY: 0,
 animations: {
 idle: { frameStart: 0, frameCount: 8, row: 0, durationSeconds: 0.7 },
 moving: { frameStart: 0, frameCount: 8, row: 0, durationSeconds: 0.45 },
 arrived: { frameStart: 0, frameCount: 8, row: 0, durationSeconds: 0.7 },
 },
 },
 eagle: {
 id: 'eagle',
 name: 'Eagle',
 assetPath: 'animals/v3/eagle.png',
 frameWidth: 32,
 frameHeight: 32,
 sheetColumns: 8,
 sheetRows: 1,
 movementType: 'flying',
 mirrorX: false,
 scale: 2.4,
 scaleX: 1,
 scaleY: 1,
 offsetX: 0,
 offsetY: 0,
 outlineMode: 'native',
 animations: {
 idle: { frameStart: 0, frameCount: 8, row: 0, durationSeconds: 0.72 },
 moving: { frameStart: 0, frameCount: 8, row: 0, durationSeconds: 0.52 },
 arrived: { frameStart: 0, frameCount: 8, row: 0, durationSeconds: 0.72 },
 },
 },
 'snow-leopard': {
 id: 'snow-leopard',
 name: 'Snow Leopard',
 assetPath: 'animals/v3/snow-leopard.png',
 frameWidth: 32,
 frameHeight: 32,
 sheetColumns: 8,
 sheetRows: 1,
 movementType: 'walking',
 mirrorX: false,
 scale: 2.35,
 scaleX: 1,
 scaleY: 1,
 offsetX: 0,
 offsetY: 0,
 outlineMode: 'native',
 animations: {
 idle: { frameStart: 0, frameCount: 8, row: 0, durationSeconds: 1.35 },
 moving: { frameStart: 0, frameCount: 8, row: 0, durationSeconds: 0.7 },
 arrived: { frameStart: 0, frameCount: 8, row: 0, durationSeconds: 1.6 },
 },
 },
 owl: {
 id: 'owl',
 name: 'Owl',
 assetPath: 'animals/v3/owl.png',
 frameWidth: 32,
 frameHeight: 32,
 sheetColumns: 8,
 sheetRows: 1,
 movementType: 'flying',
 mirrorX: false,
 scale: 2.3,
 scaleX: 1,
 scaleY: 1,
 offsetX: 0,
 offsetY: 0,
 outlineMode: 'native',
 animations: {
 idle: { frameStart: 0, frameCount: 8, row: 0, durationSeconds: 0.85 },
 moving: { frameStart: 0, frameCount: 8, row: 0, durationSeconds: 0.5 },
 arrived: { frameStart: 0, frameCount: 8, row: 0, durationSeconds: 0.85 },
 },
 },
 'mountain-goat': {
 id: 'mountain-goat',
 name: 'Mountain Goat',
 assetPath: 'animals/v3/mountain-goat.png',
 frameWidth: 32,
 frameHeight: 32,
 sheetColumns: 8,
 sheetRows: 1,
 movementType: 'walking',
 mirrorX: false,
 scale: 2.3,
 scaleX: 1,
 scaleY: 1,
 offsetX: 0,
 offsetY: 0,
 outlineMode: 'native',
 animations: {
 idle: { frameStart: 0, frameCount: 8, row: 0, durationSeconds: 1.35 },
 moving: { frameStart: 0, frameCount: 8, row: 0, durationSeconds: 0.72 },
 arrived: { frameStart: 0, frameCount: 8, row: 0, durationSeconds: 1.6 },
 },
 },
 fox: {
 id: 'fox',
 name: 'Fox',
 assetPath: 'animals/v3/fox.png',
 frameWidth: 32,
 frameHeight: 32,
 sheetColumns: 8,
 sheetRows: 1,
 movementType: 'walking',
 mirrorX: false,
 scale: 2.35,
 scaleX: 1,
 scaleY: 1,
 offsetX: 0,
 offsetY: 0,
 outlineMode: 'native',
 animations: {
 idle: { frameStart: 0, frameCount: 8, row: 0, durationSeconds: 1.25 },
 moving: { frameStart: 0, frameCount: 8, row: 0, durationSeconds: 0.58 },
 arrived: { frameStart: 0, frameCount: 8, row: 0, durationSeconds: 1.45 },
 },
 },
 salamander: {
 id: 'salamander',
 name: 'Salamander',
 assetPath: 'animals/v3/salamander.png',
 frameWidth: 32,
 frameHeight: 32,
 sheetColumns: 8,
 sheetRows: 1,
 movementType: 'walking',
 mirrorX: false,
 scale: 2.35,
 scaleX: 1,
 scaleY: 1,
 offsetX: 0,
 offsetY: 0,
 outlineMode: 'native',
 animations: {
 idle: { frameStart: 0, frameCount: 8, row: 0, durationSeconds: 1.3 },
 moving: { frameStart: 0, frameCount: 8, row: 0, durationSeconds: 0.62 },
 arrived: { frameStart: 0, frameCount: 8, row: 0, durationSeconds: 1.5 },
 },
 },
 'baby-dragon': {
 id: 'baby-dragon',
 name: 'Baby Dragon',
 assetPath: 'animals/v3/baby-dragon.png',
 frameWidth: 32,
 frameHeight: 32,
 sheetColumns: 8,
 sheetRows: 1,
 movementType: 'flying',
 mirrorX: false,
 scale: 2.35,
 scaleX: 1,
 scaleY: 1,
 offsetX: 0,
 offsetY: 0,
 outlineMode: 'native',
 animations: {
 idle: { frameStart: 0, frameCount: 8, row: 0, durationSeconds: 0.85 },
 moving: { frameStart: 0, frameCount: 8, row: 0, durationSeconds: 0.48 },
 arrived: { frameStart: 0, frameCount: 8, row: 0, durationSeconds: 0.9 },
 },
 },
 'manta-ray': {
 id: 'manta-ray',
 name: 'Manta Ray',
 assetPath: 'animals/v3/manta-ray.png',
 frameWidth: 32,
 frameHeight: 32,
 sheetColumns: 8,
 sheetRows: 1,
 movementType: 'swimming',
 mirrorX: false,
 scale: 2.4,
 scaleX: 1,
 scaleY: 1,
 offsetX: 0,
 offsetY: 0,
 outlineMode: 'native',
 animations: {
 idle: { frameStart: 0, frameCount: 8, row: 0, durationSeconds: 1.05 },
 moving: { frameStart: 0, frameCount: 8, row: 0, durationSeconds: 0.65 },
 arrived: { frameStart: 0, frameCount: 8, row: 0, durationSeconds: 1.2 },
 },
 },
 'sea-turtle': {
 id: 'sea-turtle',
 name: 'Sea Turtle',
 assetPath: 'animals/v3/sea-turtle.png',
 frameWidth: 32,
 frameHeight: 32,
 sheetColumns: 8,
 sheetRows: 1,
 movementType: 'swimming',
 mirrorX: false,
 scale: 2.35,
 scaleX: 1,
 scaleY: 1,
 offsetX: 0,
 offsetY: 0,
 outlineMode: 'native',
 animations: {
 idle: { frameStart: 0, frameCount: 8, row: 0, durationSeconds: 1.15 },
 moving: { frameStart: 0, frameCount: 8, row: 0, durationSeconds: 0.72 },
 arrived: { frameStart: 0, frameCount: 8, row: 0, durationSeconds: 1.3 },
 },
 },
};

export const getAnimalConfig = (animalId: AnimalId): AnimalConfig => ANIMALS[animalId] ?? ANIMALS.bat;
