import { JourneyThemeId } from './types';

export interface JourneyPoint {
 x: number;
 y: number;
}

export type JourneyDirection = 'up' | 'down' | 'inward';
export type JourneyGoalIcon = 'summit' | 'crown' | 'star' | 'crater' | 'abyss';
export type JourneyEnvironmentKind = 'asset' | 'procedural-mountain' | 'procedural-scene';

export interface JourneyThemePalette {
 completed: string;
 current: string;
 available: string;
 locked: string;
 path: string;
 markerSurface: string;
}

export interface JourneyTheme {
 id: JourneyThemeId;
 name: string;
 description: string;
 previewUrl: string;
 backgroundUrl: string;
 environmentKind: JourneyEnvironmentKind;
 direction: JourneyDirection;
 palette: JourneyThemePalette;
 milestonePositions: JourneyPoint[];
 route: JourneyPoint[];
 goalIcon: JourneyGoalIcon;
}

const theme = (
 id: JourneyThemeId,
 name: string,
 description: string,
 direction: JourneyDirection,
 route: JourneyPoint[],
 goalIcon: JourneyGoalIcon,
 palette: JourneyThemePalette,
): JourneyTheme => ({
 id,
 name,
 description,
 previewUrl: `/themes/${id}/preview.webp`,
  backgroundUrl: `/themes/${id}/background.webp`,
  environmentKind: id === 'mountain' ? 'procedural-mountain' : 'procedural-scene',
 direction,
 palette,
 milestonePositions: route.filter((_, index) => index > 0 && index < route.length - 1),
 route,
 goalIcon,
});

export const JOURNEY_THEMES: Record<JourneyThemeId, JourneyTheme> = {
 mountain: theme(
 'mountain',
 'Mountain Ascent',
 'Climb from base camp to a clear summit.',
 'up',
 [
 { x: 180, y: 650 }, { x: 340, y: 570 }, { x: 485, y: 485 },
 { x: 690, y: 405 }, { x: 760, y: 290 }, { x: 685, y: 185 }, { x: 610, y: 82 },
 ],
 'summit',
 { completed: '#279a6d', current: '#ff7847', available: '#d19b2a', locked: '#7f8490', path: '#8b8d94', markerSurface: '#fffdf8' },
 ),
 'world-tree': theme(
 'world-tree',
 'World Tree',
 'Rise through roots, trunk, boughs, and crown.',
 'up',
 [
 { x: 180, y: 650 }, { x: 355, y: 610 }, { x: 480, y: 525 },
 { x: 560, y: 425 }, { x: 500, y: 325 }, { x: 610, y: 220 }, { x: 540, y: 82 },
 ],
 'crown',
 { completed: '#3f9c66', current: '#d98b3f', available: '#a77b46', locked: '#7a8077', path: '#6f796c', markerSurface: '#f7f4e8' },
 ),
 cosmic: theme(
 'cosmic',
 'Cosmic Journey',
 'Travel through an orbital path toward a bright star.',
 'up',
 [
 { x: 155, y: 635 }, { x: 310, y: 530 }, { x: 500, y: 585 },
 { x: 675, y: 455 }, { x: 850, y: 350 }, { x: 730, y: 215 }, { x: 980, y: 88 },
 ],
 'star',
 { completed: '#5ec4b6', current: '#e67bc5', available: '#8f8de5', locked: '#6f758c', path: '#8b8ab5', markerSurface: '#f8f5ff' },
 ),
 volcano: theme(
 'volcano',
 'Volcanic Peak',
 'Advance across dark rock toward the crater rim.',
 'up',
 [
 { x: 170, y: 650 }, { x: 315, y: 590 }, { x: 440, y: 515 },
 { x: 555, y: 435 }, { x: 630, y: 325 }, { x: 555, y: 205 }, { x: 600, y: 92 },
 ],
 'crater',
 { completed: '#4cae78', current: '#ff6b35', available: '#e2a33b', locked: '#79787c', path: '#726d70', markerSurface: '#fff8f0' },
 ),
 ocean: theme(
 'ocean',
 'Ocean Dive',
 'Descend from the surface toward the calm abyss.',
 'down',
 [
 { x: 175, y: 78 }, { x: 335, y: 165 }, { x: 520, y: 255 },
 { x: 700, y: 335 }, { x: 575, y: 440 }, { x: 770, y: 545 }, { x: 635, y: 650 },
 ],
 'abyss',
 { completed: '#36bda0', current: '#39a6e8', available: '#6e91c7', locked: '#647585', path: '#7095a8', markerSurface: '#f2fbff' },
 ),
 castle: theme(
 'castle',
 'Castle Ascent',
 'Pass the gate, courtyard, hall, tower, and Crown Chamber.',
 'up',
 [
 { x: 235, y: 650 }, { x: 410, y: 585 }, { x: 535, y: 505 },
 { x: 650, y: 420 }, { x: 610, y: 325 }, { x: 700, y: 220 }, { x: 760, y: 88 },
 ],
 'crown',
 { completed: '#36926c', current: '#c56c4a', available: '#b08b4f', locked: '#757985', path: '#777985', markerSurface: '#fffaf2' },
 ),
};

export const JOURNEY_THEME_IDS = Object.keys(JOURNEY_THEMES) as JourneyThemeId[];

export const getJourneyTheme = (themeId?: JourneyThemeId): JourneyTheme => (
 JOURNEY_THEMES[themeId ?? 'mountain'] ?? JOURNEY_THEMES.mountain
);
