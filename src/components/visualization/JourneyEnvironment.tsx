import React, { useMemo } from 'react';
import {
  generateProceduralMountain,
  generateProceduralThemeEnvironment,
  JourneyCloud,
  JourneyEnvironmentPrimitive,
  JourneyTerrainProfile,
  JourneyPolygon,
} from '@/lib/journeyEnvironments';
import { JourneyTheme } from '@/lib/journeyThemes';
import { JourneyThemeId } from '@/lib/types';
import styles from './MountainProgressMap.module.css';

interface JourneyEnvironmentProps {
  theme: JourneyTheme;
  seed: number;
  route?: { x: number; y: number }[];
  profile?: JourneyTerrainProfile;
}

const polygonPoints = (shape: JourneyPolygon) => shape.points.map(({ x, y }) => `${x},${y}`).join(' ');

const PixelCloud: React.FC<{ cloud: JourneyCloud }> = ({ cloud }) => (
  <g
    transform={`translate(${cloud.x} ${cloud.y}) scale(${cloud.scale})`}
    opacity={cloud.opacity}
    className={styles.environmentCloud}
  >
    <rect x="0" y="16" width="108" height="18" />
    <rect x="18" y="8" width="58" height="22" />
    <rect x="38" y="0" width="34" height="28" />
    <rect x="72" y="12" width="58" height="22" />
  </g>
);

const EnvironmentPrimitive: React.FC<{ shape: JourneyEnvironmentPrimitive }> = ({ shape }) => {
  if (shape.kind === 'polygon') {
    return <polygon points={shape.points.map(({ x, y }) => `${x},${y}`).join(' ')} fill={shape.fill} opacity={shape.opacity} />;
  }
  if (shape.kind === 'circle') {
    return <circle cx={shape.x} cy={shape.y} r={shape.radius} fill={shape.fill} opacity={shape.opacity} />;
  }
  return (
    <rect
      x={shape.x}
      y={shape.y}
      width={shape.width}
      height={shape.height}
      rx={shape.radius}
      fill={shape.fill}
      opacity={shape.opacity}
    />
  );
};

export const JourneyEnvironment: React.FC<JourneyEnvironmentProps> = ({ theme, seed, route, profile }) => {
  const environmentOptions = useMemo(() => ({
    profile,
    start: route?.[0],
    destination: route?.at(-1),
  }), [profile, route]);
  const mountain = useMemo(
    () => theme.environmentKind === 'procedural-mountain'
      ? generateProceduralMountain(seed, environmentOptions)
      : null,
    [environmentOptions, seed, theme.environmentKind],
  );
  const scene = useMemo(
    () => theme.environmentKind === 'procedural-scene'
      ? generateProceduralThemeEnvironment(theme.id as Exclude<JourneyThemeId, 'mountain'>, seed, environmentOptions)
      : null,
    [environmentOptions, seed, theme.environmentKind, theme.id],
  );

  if (scene) {
    const gradientId = `${scene.themeId}-sky-${seed}`;
    return (
      <g className={styles.environment} aria-hidden="true" shapeRendering="crispEdges">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={scene.skyTop} />
            <stop offset="100%" stopColor={scene.skyBottom} />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="1200" height="720" fill={`url(#${gradientId})`} />
        {scene.shapes.map((shape) => <EnvironmentPrimitive key={shape.id} shape={shape} />)}
      </g>
    );
  }

  if (!mountain) {
    return (
      <image
        href={theme.backgroundUrl}
        x="0"
        y="0"
        width="1200"
        height="720"
        preserveAspectRatio="xMidYMid slice"
        className={styles.environment}
      />
    );
  }

  const gradientId = `mountain-sky-${seed}`;
  return (
    <g className={styles.environment} aria-hidden="true" shapeRendering="crispEdges">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={mountain.skyTop} />
          <stop offset="100%" stopColor={mountain.skyBottom} />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="1200" height="720" fill={`url(#${gradientId})`} />
      <circle
        cx={mountain.sun.x}
        cy={mountain.sun.y}
        r={mountain.sun.radius}
        fill="#f6d477"
        opacity={mountain.sun.opacity}
      />
      {mountain.clouds.map((cloud) => <PixelCloud key={cloud.id} cloud={cloud} />)}
      {mountain.distantPeaks.map((shape) => (
        <polygon key={shape.id} points={polygonPoints(shape)} fill={shape.fill} opacity={shape.opacity} />
      ))}
      <polygon points={polygonPoints(mountain.mountain)} fill={mountain.mountain.fill} />
      {mountain.facets.map((shape) => (
        <polygon key={shape.id} points={polygonPoints(shape)} fill={shape.fill} opacity={shape.opacity} />
      ))}
      <polygon points={polygonPoints(mountain.snow)} fill={mountain.snow.fill} />
      <polygon
        points={polygonPoints(mountain.foreground)}
        fill={mountain.foreground.fill}
        opacity={mountain.foreground.opacity}
      />
    </g>
  );
};
