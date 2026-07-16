import { JourneyPoint } from './journeyThemes';
import { JourneyThemeId } from './types';

export interface JourneyPolygon {
  id: string;
  points: JourneyPoint[];
  fill: string;
  opacity?: number;
}

export interface JourneyCloud {
  id: string;
  x: number;
  y: number;
  scale: number;
  opacity: number;
}

export interface ProceduralMountainEnvironment {
  seed: number;
  skyTop: string;
  skyBottom: string;
  sun: JourneyPoint & { radius: number; opacity: number };
  clouds: JourneyCloud[];
  distantPeaks: JourneyPolygon[];
  mountain: JourneyPolygon;
  facets: JourneyPolygon[];
  snow: JourneyPolygon;
  foreground: JourneyPolygon;
}

export interface JourneyTerrainProfile {
  milestoneCount: number;
  taskCount: number;
  effort: number;
}

export interface JourneyEnvironmentOptions {
  profile?: JourneyTerrainProfile;
  start?: JourneyPoint;
  destination?: JourneyPoint;
}

export type JourneyEnvironmentPrimitive =
  | { id: string; kind: 'polygon'; points: JourneyPoint[]; fill: string; opacity?: number }
  | { id: string; kind: 'circle'; x: number; y: number; radius: number; fill: string; opacity?: number }
  | { id: string; kind: 'rect'; x: number; y: number; width: number; height: number; fill: string; opacity?: number; radius?: number };

export interface ProceduralThemeEnvironment {
  seed: number;
  themeId: Exclude<JourneyThemeId, 'mountain'>;
  skyTop: string;
  skyBottom: string;
  shapes: JourneyEnvironmentPrimitive[];
}

const WIDTH = 1200;
const HEIGHT = 720;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const DEFAULT_TERRAIN_PROFILE: JourneyTerrainProfile = { milestoneCount: 3, taskCount: 6, effort: 9 };

const seededRandom = (seed: number) => {
  let state = seed || 1;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};

const point = (x: number, y: number): JourneyPoint => ({
  x: Math.round(clamp(x, 0, WIDTH)),
  y: Math.round(clamp(y, 0, HEIGHT)),
});

const mountainPalette = [
  {
    skyTop: '#f1c99d',
    skyBottom: '#fff0dc',
    far: '#c7c4c0',
    farShade: '#aaaeb0',
    rock: '#596572',
    rockDark: '#424d59',
    rockLight: '#74808b',
    snow: '#f5f1e9',
    snowShade: '#d8d9d7',
    ground: '#303b45',
  },
  {
    skyTop: '#edc8ae',
    skyBottom: '#f9eee0',
    far: '#c4c2c4',
    farShade: '#a8adb4',
    rock: '#5b6470',
    rockDark: '#404a56',
    rockLight: '#78828b',
    snow: '#f4f2ed',
    snowShade: '#d4d7d9',
    ground: '#343d47',
  },
] as const;

export const generateProceduralMountain = (
  seed: number,
  options: JourneyEnvironmentOptions = {},
): ProceduralMountainEnvironment => {
  const random = seededRandom(seed ^ 0x85ebca6b);
  const palette = mountainPalette[seed % mountainPalette.length];
  const profile = options.profile ?? DEFAULT_TERRAIN_PROFILE;
  const journeyScale = clamp(Math.sqrt(Math.max(1, profile.effort)) / 18, 0, 1);
  const cameraPullback = clamp((profile.milestoneCount - 6) / 18, 0, 1);
  const summitX = Math.round(options.destination?.x ?? (580 + ((random() - 0.5) * 90)));
  const summitY = Math.round(clamp(options.destination?.y ?? (72 + (random() * 25)), 58, 108));
  // Dense journeys use a wider trail but a slightly smaller mountain profile,
  // creating a pullback instead of making the mountain grow toward the camera.
  const shoulderSpread = 210 + (journeyScale * 25) - (cameraPullback * 40);
  const shoulderLeft = summitX - shoulderSpread - Math.round(random() * 28);
  const shoulderRight = summitX + shoulderSpread + 15 + Math.round(random() * 34);
  const snowLine = summitY + 190 + (journeyScale * 34) - (cameraPullback * 18) + Math.round(random() * 24);
  const summitHalfWidth = 10 + Math.round(journeyScale * 4);

  const mainPoints = [
    point(18, 705),
    point(115, 625 - random() * 25),
    point(220, 525 - random() * 35),
    point(shoulderLeft - 90, 430 - random() * 30),
    point(shoulderLeft, 310 - random() * 24),
    point(summitX - 86, summitY + 118),
    point(summitX - summitHalfWidth, summitY + 8),
    point(summitX, summitY),
    point(summitX + summitHalfWidth, summitY + 8),
    point(summitX + 92, summitY + 122),
    point(shoulderRight, 318 - random() * 18),
    point(shoulderRight + 120, 445 - random() * 25),
    point(1080, 590 - random() * 25),
    point(1190, 690),
    point(1190, 720),
    point(18, 720),
  ];

  const snowPoints = [
    point(summitX - 205, snowLine + 42),
    point(summitX - 150, snowLine - 7),
    point(summitX - 118, snowLine + 18),
    point(summitX - 82, snowLine - 28),
    point(summitX - 45, snowLine + 10),
    point(summitX - summitHalfWidth, summitY + 8),
    point(summitX, summitY),
    point(summitX + summitHalfWidth, summitY + 8),
    point(summitX + 92, summitY + 122),
    point(summitX + 146, snowLine - 13),
    point(summitX + 192, snowLine + 32),
    point(summitX + 118, snowLine + 60),
    point(summitX + 68, snowLine + 34),
    point(summitX + 5, snowLine + 76),
    point(summitX - 55, snowLine + 38),
    point(summitX - 118, snowLine + 68),
  ];

  const distantPeaks: JourneyPolygon[] = [
    {
      id: 'far-left',
      fill: palette.far,
      opacity: 0.72,
      points: [point(0, 570), point(145, 405), point(270, 570), point(365, 455), point(500, 640), point(0, 640)],
    },
    {
      id: 'far-right',
      fill: palette.farShade,
      opacity: 0.58,
      points: [point(720, 610), point(850, 470), point(950, 560), point(1060, 425), point(1200, 585), point(1200, 655), point(720, 655)],
    },
  ];

  const facets: JourneyPolygon[] = [
    {
      id: 'left-face',
      fill: palette.rockLight,
      opacity: 0.72,
      points: [point(18, 705), point(summitX - summitHalfWidth, summitY + 8), point(summitX - 35, 420), point(410, 665), point(250, 720)],
    },
    {
      id: 'center-shadow',
      fill: palette.rockDark,
      opacity: 0.76,
      points: [point(summitX, summitY), point(summitX + 92, summitY + 122), point(summitX + 38, 390), point(710, 650), point(535, 720), point(summitX - 35, 420)],
    },
    {
      id: 'right-face',
      fill: palette.rockDark,
      opacity: 0.5,
      points: [point(summitX + 92, summitY + 122), point(shoulderRight, 315), point(1080, 590), point(1190, 690), point(940, 720), point(710, 650)],
    },
    {
      id: 'lower-ridge',
      fill: palette.rockLight,
      opacity: 0.32,
      points: [point(145, 680), point(360, 520), point(470, 585), point(575, 515), point(710, 650), point(535, 720), point(250, 720)],
    },
  ];

  return {
    seed,
    skyTop: palette.skyTop,
    skyBottom: palette.skyBottom,
    sun: {
      ...point(960 + ((random() - 0.5) * 80), 115 + (random() * 35)),
      radius: 52 + Math.round(random() * 10),
      opacity: 0.8 + (random() * 0.1),
    },
    clouds: Array.from({ length: 5 }, (_, index) => ({
      id: `cloud-${index}`,
      x: Math.round(40 + (random() * 1050)),
      y: Math.round(85 + (random() * 230)),
      scale: 0.72 + (random() * 0.65),
      opacity: 0.22 + (random() * 0.24),
    })),
    distantPeaks,
    mountain: { id: 'main-mountain', points: mainPoints, fill: palette.rock },
    facets,
    snow: { id: 'snow-cap', points: snowPoints, fill: palette.snow },
    foreground: {
      id: 'foreground',
      fill: palette.ground,
      opacity: 0.88,
      points: [point(0, 685), point(180, 672), point(350, 695), point(520, 680), point(760, 704), point(960, 676), point(1200, 694), point(1200, 720), point(0, 720)],
    },
  };
};

export const mountainGeometryIsBounded = (environment: ProceduralMountainEnvironment) => {
  const points = [
    ...environment.distantPeaks.flatMap((shape) => shape.points),
    ...environment.mountain.points,
    ...environment.facets.flatMap((shape) => shape.points),
    ...environment.snow.points,
    ...environment.foreground.points,
  ];
  return points.every(({ x, y }) => x >= 0 && x <= WIDTH && y >= 0 && y <= HEIGHT);
};

const polygon = (id: string, fill: string, points: JourneyPoint[], opacity?: number): JourneyEnvironmentPrimitive => ({
  id, kind: 'polygon', fill, points, opacity,
});

const circle = (id: string, fill: string, x: number, y: number, radius: number, opacity?: number): JourneyEnvironmentPrimitive => ({
  id, kind: 'circle', fill, x: Math.round(x), y: Math.round(y), radius: Math.round(radius), opacity,
});

const rect = (
  id: string,
  fill: string,
  x: number,
  y: number,
  width: number,
  height: number,
  opacity?: number,
  radius?: number,
): JourneyEnvironmentPrimitive => ({
  id,
  kind: 'rect',
  fill,
  x: Math.round(x),
  y: Math.round(y),
  width: Math.round(width),
  height: Math.round(height),
  opacity,
  radius,
});

const worldTreeEnvironment = (seed: number): ProceduralThemeEnvironment => {
  const random = seededRandom(seed ^ 0x27d4eb2f);
  const trunkX = 540 + Math.round((random() - 0.5) * 55);
  const shapes: JourneyEnvironmentPrimitive[] = [
    polygon('tree-hill-back', '#8eb58a', [point(0, 570), point(240, 430), point(470, 590), point(760, 440), point(1200, 610), point(1200, 720), point(0, 720)], 0.52),
    polygon('tree-ground', '#31523d', [point(0, 650), point(180, 625), point(360, 660), point(600, 620), point(850, 655), point(1050, 615), point(1200, 650), point(1200, 720), point(0, 720)]),
    polygon('tree-trunk-shadow', '#4a3829', [point(trunkX - 118, 650), point(trunkX - 78, 300), point(trunkX - 42, 98), point(trunkX + 55, 90), point(trunkX + 92, 310), point(trunkX + 145, 650)]),
    polygon('tree-trunk-light', '#72513a', [point(trunkX - 70, 650), point(trunkX - 45, 290), point(trunkX - 15, 115), point(trunkX + 32, 110), point(trunkX + 18, 360), point(trunkX + 55, 650)], 0.86),
    polygon('tree-branch-left-low', '#513b2b', [point(trunkX - 42, 430), point(trunkX - 330, 370), point(trunkX - 350, 330), point(trunkX - 25, 382)]),
    polygon('tree-branch-right-low', '#513b2b', [point(trunkX + 36, 360), point(trunkX + 320, 315), point(trunkX + 345, 270), point(trunkX + 28, 318)]),
    polygon('tree-branch-left-high', '#5e432e', [point(trunkX - 20, 255), point(trunkX - 245, 195), point(trunkX - 270, 150), point(trunkX - 5, 218)]),
  ];
  const canopyCenters = [
    [trunkX - 245, 165], [trunkX - 125, 105], [trunkX, 82], [trunkX + 135, 110], [trunkX + 260, 175],
    [trunkX - 325, 265], [trunkX + 325, 255], [trunkX - 80, 200], [trunkX + 80, 205],
  ];
  canopyCenters.forEach(([x, y], index) => {
    const radius = Math.max(36, Math.min(85 + (random() * 34), x - 4, WIDTH - x - 4, y - 4, HEIGHT - y - 4));
    shapes.push(circle(`tree-canopy-${index}`, index % 3 === 0 ? '#3f7552' : '#4f865d', x, y, radius, 0.96));
  });
  shapes.push(
    polygon('tree-root-left', '#59402e', [point(trunkX - 30, 575), point(trunkX - 300, 690), point(trunkX - 95, 650)]),
    polygon('tree-root-right', '#493528', [point(trunkX + 35, 570), point(trunkX + 340, 690), point(trunkX + 95, 646)]),
  );
  return { seed, themeId: 'world-tree', skyTop: '#9ec6a1', skyBottom: '#eef0d1', shapes };
};

const cosmicEnvironment = (seed: number): ProceduralThemeEnvironment => {
  const random = seededRandom(seed ^ 0x165667b1);
  const shapes: JourneyEnvironmentPrimitive[] = [];
  Array.from({ length: 24 }, (_, index) => {
    shapes.push(circle(`star-${index}`, index % 6 === 0 ? '#f7d88a' : '#dfe5ff', 35 + (random() * 1130), 30 + (random() * 610), 2 + (random() * 4), 0.42 + (random() * 0.5)));
  });
  shapes.push(
    circle('cosmic-planet-left', '#655b9b', 155, 160, 92, 0.74),
    circle('cosmic-planet-left-light', '#8b79bf', 130, 130, 45, 0.48),
    circle('cosmic-planet-right', '#b95f78', 1040, 220, 118, 0.56),
    circle('cosmic-goal-glow', '#f5c870', 980, 88, 54, 0.5),
    polygon('platform-bottom', '#343b63', [point(70, 670), point(245, 640), point(305, 690), point(220, 720), point(80, 710)]),
    polygon('platform-mid-left', '#3f4674', [point(240, 540), point(390, 510), point(445, 550), point(365, 590), point(260, 580)]),
    polygon('platform-mid', '#4b4e7b', [point(470, 600), point(620, 565), point(690, 600), point(600, 642), point(500, 635)]),
    polygon('platform-high', '#41486f', [point(675, 390), point(850, 350), point(920, 390), point(830, 430), point(710, 425)]),
    polygon('nebula', '#784d91', [point(330, 250), point(490, 190), point(690, 235), point(795, 320), point(620, 350), point(430, 320)], 0.18),
  );
  return { seed, themeId: 'cosmic', skyTop: '#11162f', skyBottom: '#27264c', shapes };
};

const volcanoEnvironment = (
  seed: number,
  options: JourneyEnvironmentOptions = {},
): ProceduralThemeEnvironment => {
  const random = seededRandom(seed ^ 0xd3a2646c);
  const profile = options.profile ?? DEFAULT_TERRAIN_PROFILE;
  const scale = clamp(((profile.milestoneCount - 2) / 8) + (Math.sqrt(profile.effort) / 20), 0, 1);
  const craterX = Math.round(options.destination?.x ?? (600 + ((random() - 0.5) * 50)));
  const craterY = Math.round(clamp(options.destination?.y ?? 92, 72, 118));
  const rimHalfWidth = 76 + (scale * 24);
  const leftBase = 20;
  const rightBase = 1180;
  const shapes: JourneyEnvironmentPrimitive[] = [
    circle('volcano-sun', '#d85c3d', 1010, 120, 74, 0.2),
    polygon('volcano-far-left', '#443a45', [point(0, 610), point(165, 425), point(345, 610), point(475, 500), point(590, 650), point(0, 720)], 0.64),
    polygon('volcano-far-right', '#3c343f', [point(650, 620), point(850, 420), point(1010, 565), point(1110, 445), point(1200, 565), point(1200, 720)], 0.62),
    polygon('volcano-main', '#2f2930', [point(leftBase, 710), point(150, 640), point(285, 490), point(craterX - rimHalfWidth, craterY + 54), point(craterX - 18, craterY + 26), point(craterX + rimHalfWidth, craterY + 55), point(900, 505), point(1045, 635), point(rightBase, 710), point(rightBase, 720), point(leftBase, 720)]),
    polygon('volcano-left-face', '#49393c', [point(leftBase, 710), point(craterX - rimHalfWidth, craterY + 54), point(craterX - 18, craterY + 32), point(craterX - 75, 470), point(395, 650), point(250, 720)], 0.86),
    polygon('volcano-center-face', '#372c33', [point(craterX - 18, craterY + 32), point(craterX + rimHalfWidth, craterY + 55), point(craterX + 95, 440), point(680, 650), point(520, 720), point(craterX - 75, 470)], 0.9),
    polygon('volcano-right-face', '#211f27', [point(craterX + rimHalfWidth, craterY + 55), point(900, 505), point(1045, 635), point(960, 720), point(680, 650), point(craterX + 95, 440)], 0.84),
    circle('crater-glow', '#ff9a45', craterX, craterY + 18, rimHalfWidth * 0.68, 0.46),
    rect('crater-core', '#ff6b35', craterX - rimHalfWidth, craterY + 20, rimHalfWidth * 2, 28, 0.98, 12),
    polygon('lava-main', '#ff6337', [point(craterX - 12, craterY + 42), point(craterX + 25, craterY + 42), point(craterX + 48, 280), point(craterX + 8, 395), point(craterX + 62, 610), point(craterX + 10, 560), point(craterX - 22, 330)]),
    polygon('lava-left', '#e34c2e', [point(craterX - 36, craterY + 48), point(craterX - 14, craterY + 46), point(craterX - 115, 315), point(craterX - 165, 510), point(craterX - 125, 470), point(craterX - 78, 285)], 0.92),
    polygon('lava-right', '#dc442b', [point(craterX + 42, craterY + 49), point(craterX + 64, craterY + 52), point(craterX + 155, 330), point(craterX + 205, 540), point(craterX + 165, 500), point(craterX + 112, 305)], 0.9),
    circle('ash-cloud-1', '#29242d', craterX - 46, Math.max(38, craterY - 30), 36, 0.72),
    circle('ash-cloud-2', '#3b3038', craterX + 12, Math.max(48, craterY - 52), 43, 0.75),
    circle('ash-cloud-3', '#4a3538', craterX + 66, Math.max(48, craterY - 22), 30, 0.62),
    polygon('volcano-ground', '#1c1b22', [point(0, 675), point(220, 650), point(440, 690), point(690, 650), point(900, 685), point(1200, 650), point(1200, 720), point(0, 720)]),
  ];
  return { seed, themeId: 'volcano', skyTop: '#342532', skyBottom: '#8c4b45', shapes };
};

const oceanEnvironment = (seed: number): ProceduralThemeEnvironment => {
  const random = seededRandom(seed ^ 0xfd7046c5);
  const shapes: JourneyEnvironmentPrimitive[] = [
    polygon('ocean-light-left', '#b8eff2', [point(120, 0), point(310, 0), point(510, 720), point(330, 720)], 0.16),
    polygon('ocean-light-right', '#d2f7ef', [point(630, 0), point(760, 0), point(870, 720), point(720, 720)], 0.1),
    polygon('ocean-cliff-left', '#153d52', [point(0, 335), point(95, 280), point(170, 390), point(135, 520), point(235, 720), point(0, 720)], 0.84),
    polygon('ocean-cliff-right', '#123548', [point(1200, 300), point(1090, 270), point(1015, 420), point(1040, 560), point(940, 720), point(1200, 720)], 0.9),
    polygon('ocean-floor', '#173e45', [point(0, 650), point(170, 625), point(320, 680), point(510, 645), point(690, 690), point(890, 640), point(1060, 675), point(1200, 650), point(1200, 720), point(0, 720)]),
  ];
  Array.from({ length: 15 }, (_, index) => {
    shapes.push(circle(`ocean-bubble-${index}`, '#bdeff2', 80 + (random() * 1040), 70 + (random() * 560), 3 + (random() * 8), 0.2 + (random() * 0.36)));
  });
  [190, 250, 900, 970].forEach((x, index) => {
    shapes.push(rect(`coral-stem-${index}`, index < 2 ? '#327b75' : '#376b85', x, 565 + (index % 2) * 28, 18, 100, 0.88, 8));
    shapes.push(circle(`coral-head-${index}`, index < 2 ? '#4a9a83' : '#4f85a0', x + 9, 565 + (index % 2) * 28, 27, 0.9));
  });
  return { seed, themeId: 'ocean', skyTop: '#79c8d7', skyBottom: '#12394f', shapes };
};

const castleEnvironment = (seed: number): ProceduralThemeEnvironment => {
  const random = seededRandom(seed ^ 0xb55a4f09);
  const center = 610 + Math.round((random() - 0.5) * 50);
  const shapes: JourneyEnvironmentPrimitive[] = [
    circle('castle-moon', '#f1dca0', 980, 120, 58, 0.76),
    polygon('castle-hills', '#87909a', [point(0, 580), point(180, 430), point(340, 600), point(900, 420), point(1200, 570), point(1200, 720), point(0, 720)], 0.42),
    polygon('castle-ground', '#48535a', [point(0, 645), point(240, 620), point(500, 665), point(760, 625), point(970, 660), point(1200, 630), point(1200, 720), point(0, 720)]),
    rect('castle-body', '#777477', center - 230, 270, 460, 390, 1, 8),
    rect('castle-body-light', '#918b82', center - 185, 295, 175, 365, 0.72),
    rect('castle-left-tower', '#696970', center - 300, 205, 150, 455, 1, 7),
    rect('castle-right-tower', '#62656b', center + 150, 180, 150, 480, 1, 7),
    rect('castle-center-tower', '#858078', center - 82, 95, 164, 565, 1, 7),
    polygon('roof-left', '#4d515c', [point(center - 325, 205), point(center - 225, 125), point(center - 125, 205)]),
    polygon('roof-right', '#484d57', [point(center + 125, 180), point(center + 225, 95), point(center + 325, 180)]),
    polygon('roof-center', '#555761', [point(center - 112, 95), point(center, 20), point(center + 112, 95)]),
    rect('castle-gate', '#31363c', center - 45, 530, 90, 130, 1, 42),
  ];
  [-215, -95, 95, 215].forEach((offset, index) => {
    shapes.push(rect(`castle-window-${index}`, '#e8c878', center + offset - 12, 350 + (index % 2) * 85, 24, 42, 0.78, 10));
  });
  return { seed, themeId: 'castle', skyTop: '#aeb7c9', skyBottom: '#ece0c8', shapes };
};

export const generateProceduralThemeEnvironment = (
  themeId: Exclude<JourneyThemeId, 'mountain'>,
  seed: number,
  options: JourneyEnvironmentOptions = {},
): ProceduralThemeEnvironment => {
  if (themeId === 'world-tree') return worldTreeEnvironment(seed);
  if (themeId === 'cosmic') return cosmicEnvironment(seed);
  if (themeId === 'volcano') return volcanoEnvironment(seed, options);
  if (themeId === 'ocean') return oceanEnvironment(seed);
  return castleEnvironment(seed);
};

export const proceduralThemeGeometryIsBounded = (environment: ProceduralThemeEnvironment) => (
  environment.shapes.every((shape) => {
    if (shape.kind === 'polygon') {
      return shape.points.every(({ x, y }) => x >= 0 && x <= WIDTH && y >= 0 && y <= HEIGHT);
    }
    if (shape.kind === 'circle') {
      return shape.radius >= 0
        && shape.x - shape.radius >= 0
        && shape.x + shape.radius <= WIDTH
        && shape.y - shape.radius >= 0
        && shape.y + shape.radius <= HEIGHT;
    }
    return shape.x >= 0 && shape.y >= 0 && shape.x + shape.width <= WIDTH && shape.y + shape.height <= HEIGHT;
  })
);
