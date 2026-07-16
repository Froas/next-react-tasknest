'use client';

import React, { CSSProperties, useMemo } from 'react';
import { Crown, Flag, Flame, Footprints, Mountain, Star, Target, Waves } from 'lucide-react';
import { AnimalId } from '@/lib/journeyAnimals';
import { GoalItem } from '@/lib/types';
import {
  generateJourneyMap,
  JourneyCheckpoint,
  locateJourneyDisplayProgress,
  selectJourneyIndices,
} from '@/lib/journeyMap';
import { getJourneyTheme, JourneyTheme } from '@/lib/journeyThemes';
import { JourneyEnvironment } from './JourneyEnvironment';
import { MovingCharacter } from './MovingCharacter';
import styles from './MountainProgressMap.module.css';

interface ProgressMapProps {
  goal: GoalItem;
  theme?: JourneyTheme;
  progress: number;
  replayKey?: number;
  forceReducedMotion?: boolean;
  character?: AnimalId;
}

type CheckpointState = 'completed' | 'current' | 'available' | 'locked';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const truncate = (value: string, length = 27) => (
  value.length > length ? `${value.slice(0, length - 1)}…` : value
);

const checkpointState = (
  point: JourneyCheckpoint,
  currentId: string | undefined,
  previousComplete: boolean,
): CheckpointState => {
  if (point.completed || point.kind === 'start') return 'completed';
  if (point.id === currentId) return 'current';
  return previousComplete ? 'available' : 'locked';
};

const checkpointDescription = (point: JourneyCheckpoint, state: CheckpointState) => {
  if (point.kind === 'start') return 'Journey begins';
  if (point.kind === 'goal') return state === 'completed' ? 'Goal reached' : 'Final destination';
  return `${point.completedTaskCount}/${point.taskCount} tasks · ${state}`;
};

const stateTone = (state: CheckpointState) => {
  if (state === 'completed') return 'var(--viz-completed)';
  if (state === 'current') return 'var(--viz-current)';
  if (state === 'available') return 'var(--viz-available)';
  return 'var(--viz-locked)';
};

const pointDistance = (a: JourneyCheckpoint, b: JourneyCheckpoint) => Math.hypot(a.x - b.x, a.y - b.y);

const visibleLabelIndices = (points: JourneyCheckpoint[], currentIndex: number) => {
  if (points.length <= 5) {
    return new Set(Array.from({ length: points.length }, (_, index) => index));
  }

  const selected = new Set([currentIndex]);
  const current = points[currentIndex];
  const start = points[0];
  const destinationIndex = points.length - 1;
  const destination = points[destinationIndex];

  // Detail cards are intentionally sparse on long trails. Marker titles and
  // the checkpoint navigator still expose every milestone.
  if (currentIndex !== 0 && pointDistance(current, start) >= 180) selected.add(0);
  if (currentIndex !== destinationIndex && pointDistance(current, destination) >= 180) {
    selected.add(destinationIndex);
  }
  return selected;
};

const goalIcon = (theme: JourneyTheme) => {
  if (theme.goalIcon === 'crown') return <Crown size={22} />;
  if (theme.goalIcon === 'star') return <Star size={22} />;
  if (theme.goalIcon === 'crater') return <Flame size={22} />;
  if (theme.goalIcon === 'abyss') return <Waves size={22} />;
  return <Mountain size={22} />;
};

export const ProgressMap: React.FC<ProgressMapProps> = ({
  goal,
  theme: themeOverride,
  progress,
  replayKey = 0,
  forceReducedMotion = false,
  character = 'bat',
}) => {
  const theme = themeOverride ?? getJourneyTheme(goal.journey_theme_id);
  const data = useMemo(() => generateJourneyMap(goal, theme), [goal, theme]);
  const normalizedProgress = clamp(progress, 0, 100);
  const progressLocation = locateJourneyDisplayProgress(data.checkpoints, normalizedProgress, data.route);
  const startPoint = data.checkpoints[0];
  const lastCheckpointIndex = data.checkpoints.length - 1;
  const currentCheckpointIndex = normalizedProgress >= 100
    ? lastCheckpointIndex
    : clamp(progressLocation.segmentIndex + 1, 0, lastCheckpointIndex);
  const currentCheckpoint = data.checkpoints[currentCheckpointIndex];
  const labelsToShow = data.presentation.density === 'full' && data.checkpoints.length <= 5
    ? visibleLabelIndices(data.checkpoints, currentCheckpointIndex)
    : new Set([lastCheckpointIndex]);
  const visibleCheckpointIndices = selectJourneyIndices(
    data.checkpoints.length,
    data.presentation.maxVisibleCheckpoints,
    [0, currentCheckpointIndex, lastCheckpointIndex],
  );
  const visibleTaskStepIndices = selectJourneyIndices(
    data.taskSteps.length,
    data.presentation.maxVisibleTaskSteps,
  );
  const milestonePoints = data.checkpoints.filter((point) => point.kind === 'milestone');
  const completedMilestones = milestonePoints.filter((point) => point.completed).length;
  const completedTasks = data.taskSteps.filter((step) => step.completed).length;
  const paletteStyle = {
    '--viz-completed': theme.palette.completed,
    '--viz-current': theme.palette.current,
    '--viz-available': theme.palette.available,
    '--viz-locked': theme.palette.locked,
    '--viz-route': theme.palette.path,
    '--viz-marker-surface': theme.palette.markerSurface,
  } as CSSProperties;

  return (
    <section
      className={styles.mapShell}
      style={paletteStyle}
      data-density={data.presentation.density}
      data-camera={data.presentation.cameraMode}
      aria-label={`${theme.name} for ${goal.title}`}
    >
      <header className={styles.mapHeader}>
        <span className={styles.mapHeaderIcon} aria-hidden="true">{goalIcon(theme)}</span>
        <span className={styles.mapHeaderTitle}>
          <strong>{theme.name}</strong>
          <small>{goal.title}</small>
        </span>
        <span className={styles.mapHeaderProgress}>
          <strong>{Math.round(normalizedProgress)}%</strong>
          <small>{completedMilestones}/{milestonePoints.length} milestones reached</small>
        </span>
      </header>

      <div className={styles.mapViewport}>
        <svg
          className={styles.mapSvg}
          viewBox="0 0 1200 720"
          role="img"
          aria-label={`${theme.name} progress map for ${goal.title}`}
          aria-describedby="journey-map-description"
          preserveAspectRatio="xMidYMid meet"
        >
          <desc id="journey-map-description">
            An effort-weighted journey with shared milestone markers, structural task steps,
            and the selected character marking current structural progress over the chosen environment.
          </desc>
          <defs>
            <filter id={`glow-${data.seed}`} x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            {data.routeSegments.map((segment, index) => {
              const isActiveSegment = normalizedProgress < 100 && index === progressLocation.segmentIndex;
              if (!isActiveSegment || progressLocation.ratio <= 0) return null;
              const revealed = clamp(progressLocation.ratio * 100, 0, 100);
              return (
                <mask key={segment.id} id={`route-progress-${data.seed}-${index}`}>
                  <path
                    d={segment.path}
                    pathLength={100}
                    fill="none"
                    stroke="white"
                    strokeWidth="22"
                    strokeLinecap="round"
                    strokeDasharray={`${revealed} ${100 - revealed}`}
                  />
                </mask>
              );
            })}
          </defs>

          <JourneyEnvironment
            theme={theme}
            seed={data.seed}
            route={data.route}
            profile={data.terrainProfile}
          />
          <rect x="0" y="0" width="1200" height="720" className={styles.environmentWash} />
          {data.decorations.map((decoration) => {
            if (decoration.kind === 'bubble') {
              return <circle key={decoration.id} cx={decoration.x} cy={decoration.y} r={decoration.size} fill="none" stroke={theme.palette.available} strokeWidth="2" opacity={decoration.opacity} className={styles.decoration} />;
            }
            if (decoration.kind === 'leaf') {
              return <ellipse key={decoration.id} cx={decoration.x} cy={decoration.y} rx={decoration.size * 1.45} ry={decoration.size * .65} fill={theme.palette.completed} opacity={decoration.opacity} transform={`rotate(-28 ${decoration.x} ${decoration.y})`} className={styles.decoration} />;
            }
            if (decoration.kind === 'spark') {
              return <rect key={decoration.id} x={decoration.x - decoration.size / 2} y={decoration.y - decoration.size / 2} width={decoration.size} height={decoration.size} fill={theme.palette.markerSurface} opacity={decoration.opacity} transform={`rotate(45 ${decoration.x} ${decoration.y})`} className={styles.decoration} />;
            }
            return <circle key={decoration.id} cx={decoration.x} cy={decoration.y} r={decoration.size} fill={decoration.kind === 'ember' ? theme.palette.current : theme.palette.markerSurface} opacity={decoration.opacity} className={styles.decoration} />;
          })}

          {data.routeSegments.map((segment, index) => {
            const isCompletedSegment = normalizedProgress >= 100 || index < progressLocation.segmentIndex;
            const isActiveSegment = normalizedProgress < 100 && index === progressLocation.segmentIndex;
            return (
              <g key={segment.id}>
                <path d={segment.path} className={styles.routeSegment} />
                {isCompletedSegment && <path d={segment.path} className={styles.routeCompleted} />}
                {isActiveSegment && progressLocation.ratio > 0 && (
                  <path
                    d={segment.path}
                    className={styles.routeCurrent}
                    mask={`url(#route-progress-${data.seed}-${index})`}
                  />
                )}
              </g>
            );
          })}

          {data.taskSteps.map((task, index) => visibleTaskStepIndices.has(index) && (
            <a key={task.id} href={`/task/${task.id}`} aria-label={`Open task ${task.title}`}>
              <circle
                className={styles.taskStep}
                cx={task.x}
                cy={task.y}
                r={data.presentation.density === 'full' ? 4 : data.presentation.density === 'compact' ? 3.25 : 2.5}
                fill={task.completed ? 'var(--viz-completed)' : 'var(--viz-marker-surface)'}
                stroke={task.completed ? 'var(--viz-completed)' : 'var(--viz-route)'}
                strokeWidth="2.5"
              />
            </a>
          ))}

          {data.checkpoints.map((point, index) => {
            if (!visibleCheckpointIndices.has(index)) return null;
            const previousComplete = data.checkpoints
              .slice(0, index)
              .every((candidate) => candidate.completed || candidate.kind === 'start');
            const state = checkpointState(point, currentCheckpoint?.id, previousComplete);
            const tone = stateTone(state);
            const href = point.kind === 'milestone'
              ? `/milestone/${point.id}`
              : point.kind === 'goal'
                ? `/goal/${goal.id}`
                : undefined;
            const labelWidth = 196;
            const labelOnLeft = point.x > 665 || (index % 2 === 1 && point.x > 360);
            const labelX = clamp(
              labelOnLeft ? point.x - labelWidth - 28 : point.x + 28,
              18,
              1200 - labelWidth - 18,
            );
            const labelY = clamp(point.y - 31, 14, 642);
            const compactMarker = data.presentation.density === 'compact';
            const clusteredMarker = data.presentation.density === 'dense' || data.presentation.density === 'clustered';
            const ringRadius = state === 'current'
              ? 19
              : clusteredMarker
                ? 9
                : compactMarker
                  ? 11
                  : 14;
            const coreRadius = state === 'current' ? 5 : clusteredMarker ? 3.5 : 5;
            const marker = (
              <>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={ringRadius}
                  fill="var(--viz-marker-surface)"
                  stroke={tone}
                  strokeWidth={state === 'current' ? 6 : clusteredMarker ? 3 : 4}
                  className={styles.checkpointRing}
                  filter={state === 'current' ? `url(#glow-${data.seed})` : undefined}
                />
                <circle cx={point.x} cy={point.y} r={coreRadius} fill={tone} />
                {point.kind === 'milestone' && point.completed && (
                  <g
                    transform={`translate(${point.x + (ringRadius * .72)} ${point.y - (ringRadius * .72)})`}
                    className={styles.checkpointReward}
                    aria-hidden="true"
                  >
                    <circle
                      cx="0"
                      cy="0"
                      r="7"
                      fill={theme.palette.completed}
                      stroke={theme.palette.markerSurface}
                      strokeWidth="2"
                    />
                    <path
                      d="M 0 -4 L 1.2 -1.3 L 4 -1.2 L 1.9 .8 L 2.5 3.7 L 0 2.2 L -2.5 3.7 L -1.9 .8 L -4 -1.2 L -1.2 -1.3 Z"
                      fill={theme.palette.markerSurface}
                    />
                  </g>
                )}
                {labelsToShow.has(index) && (
                  <foreignObject
                    x={labelX}
                    y={labelY}
                    width={labelWidth}
                    height="62"
                    className={styles.checkpointLabel}
                  >
                    <div className={styles.checkpointCard} data-state={state}>
                      <strong>{truncate(point.title)}</strong>
                      <span>{checkpointDescription(point, state)}</span>
                    </div>
                  </foreignObject>
                )}
              </>
            );

            return href ? (
              <a key={point.id} href={href} className={styles.checkpointLink} aria-label={`Open ${point.title}`}>
                {marker}
              </a>
            ) : <g key={point.id}>{marker}</g>;
          })}

          <MovingCharacter
            key={`${goal.id}:${character}`}
            point={progressLocation.point}
            startPoint={startPoint}
            route={data.route}
            routeRatio={progressLocation.routeRatio}
            replayKey={replayKey}
            forceReducedMotion={forceReducedMotion}
            animalId={character}
          />
        </svg>
      </div>

      <footer className={styles.journeySummary}>
        <span className={styles.summaryItem}>
          {goalIcon(theme)}
          <span><strong>{data.checkpoints.length}</strong><small>Stages</small></span>
        </span>
        <span className={styles.summaryItem}>
          <Flag size={19} aria-hidden="true" />
          <span><strong>{completedMilestones}/{milestonePoints.length}</strong><small>Milestones</small></span>
        </span>
        <span className={styles.summaryItem}>
          <Footprints size={19} aria-hidden="true" />
          <span><strong>{completedTasks}/{data.taskSteps.length}</strong><small>Trail steps</small></span>
        </span>
        <span className={styles.summaryItem}>
          <Target size={19} aria-hidden="true" />
          <span><strong>{truncate(currentCheckpoint?.title ?? goal.title, 20)}</strong><small>Current target</small></span>
        </span>
      </footer>

      <nav className={styles.campStrip} aria-label="Journey checkpoints">
        {data.checkpoints.slice(1).map((point, checkpointIndex) => {
          const index = checkpointIndex + 1;
          const previousComplete = data.checkpoints
            .slice(0, index)
            .every((candidate) => candidate.completed || candidate.kind === 'start');
          const state = checkpointState(point, currentCheckpoint?.id, previousComplete);
          const href = point.kind === 'milestone' ? `/milestone/${point.id}` : `/goal/${goal.id}`;
          return (
            <a key={point.id} href={href} className={styles.campCard} data-state={state}>
              <span className={styles.campIndex}>{String(index).padStart(2, '0')}</span>
              <span className={styles.campText}>
                <strong>{point.title}</strong>
                <small>{checkpointDescription(point, state)}</small>
              </span>
            </a>
          );
        })}
      </nav>
    </section>
  );
};

export const MountainProgressMap: React.FC<Omit<ProgressMapProps, 'character'> & { animalId?: AnimalId }> = ({
  animalId,
  ...props
}) => <ProgressMap {...props} character={animalId} />;
