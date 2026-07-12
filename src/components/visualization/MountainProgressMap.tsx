'use client';

import React, { useMemo } from 'react';
import { AnimalId } from '@/lib/journeyAnimals';
import { GoalItem } from '@/lib/types';
import { generateMountainMap, JourneyPoint, pointAtJourneyProgress } from '@/lib/mountainMap';
import { MovingCharacter } from './MovingCharacter';
import styles from './MountainProgressMap.module.css';

interface MountainProgressMapProps {
 goal: GoalItem;
 progress: number;
 replayKey?: number;
 forceReducedMotion?: boolean;
 animalId?: AnimalId;
}

const truncate = (value: string, length = 24) => value.length > length ? `${value.slice(0, length - 1)}…` : value;

const checkpointState = (point: JourneyPoint, currentId: string | undefined, previousComplete: boolean) => {
 if (point.completed || point.kind === 'start') return 'completed';
 if (point.id === currentId) return 'current';
 return previousComplete ? 'available' : 'locked';
};

export const MountainProgressMap: React.FC<MountainProgressMapProps> = ({
 goal,
 progress,
 replayKey = 0,
 forceReducedMotion = false,
 animalId = 'bat',
}) => {
 const data = useMemo(() => generateMountainMap(goal), [goal]);
 const characterPoint = pointAtJourneyProgress(data.checkpoints, progress);
 const startPoint = data.checkpoints[0];
 const milestonePoints = data.checkpoints.filter((point) => point.kind === 'milestone');
 const currentMilestone = milestonePoints.find((point) => !point.completed) ?? data.checkpoints.at(-1);

 return (
 <div className={styles.mapShell}>
 <div className={styles.mapViewport}>
 <svg className={styles.mapSvg} viewBox="0 0 1200 720" role="img" aria-labelledby="mountain-map-title mountain-map-description" preserveAspectRatio="xMidYMid meet">
 <title id="mountain-map-title">Progress mountain for {goal.title}</title>
 <desc id="mountain-map-description">A generated mountain journey with milestones as camps, tasks as trail steps, and the selected character marking current structural progress.</desc>
 <defs>
 <filter id={`glow-${data.seed}`} x="-80%" y="-80%" width="260%" height="260%">
 <feGaussianBlur stdDeviation="5" result="blur" />
 <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
 </filter>
 </defs>

 {data.stars.map((star, index) => <circle key={index} cx={star.x} cy={star.y} r={star.radius} fill="var(--viz-star)" opacity={star.opacity} />)}
 <circle cx="1010" cy="105" r="48" fill="var(--viz-moon)" />
 <path d={data.farMountainPath} fill="var(--viz-mountain-far)" />
 <path d={data.mountainPath} fill="var(--viz-mountain-main)" stroke="var(--viz-mountain-outline)" strokeWidth="4" strokeLinejoin="round" />
 <path d={data.snowPath} fill="var(--viz-snow)" />
 <path d="M0 657 C210 624 410 686 630 650 C850 617 1030 670 1200 638 V720 H0 Z" fill="var(--viz-ground)" />

 <path d={data.routePath} className={styles.route} />
 <path d={data.routePath} className={styles.routeProgress} pathLength={100} strokeDasharray={`${Math.max(0, Math.min(100, progress))} 100`} />

 {data.taskSteps.map((task) => (
 <a key={task.id} href={`/task/${task.id}`} aria-label={`Open task ${task.title}`}>
 <title>{task.title}</title>
 <circle className={styles.taskStep} cx={task.x} cy={task.y} r={5} fill={task.completed ? 'var(--viz-completed)' : 'var(--viz-marker-surface)'} stroke={task.completed ? 'var(--viz-completed)' : 'var(--viz-locked)'} strokeWidth="3" />
 </a>
 ))}

 {data.checkpoints.map((point, index) => {
 const previousComplete = data.checkpoints.slice(0, index).every((candidate) => candidate.completed || candidate.kind === 'start');
 const state = checkpointState(point, currentMilestone?.id, previousComplete);
 const tone = state === 'completed'
 ? 'var(--viz-completed)'
 : state === 'current'
 ? 'var(--viz-current)'
 : state === 'available'
 ? 'var(--viz-available)'
 : 'var(--viz-locked)';
 const href = point.kind === 'milestone' ? `/milestone/${point.id}` : point.kind === 'summit' ? `/goal/${goal.id}` : undefined;
 const labelOnLeft = index % 2 === 1;
 const content = (
 <g>
 <circle cx={point.x} cy={point.y} r={state === 'current' ? 20 : 15} fill="var(--viz-marker-surface)" stroke={tone} strokeWidth={state === 'current' ? 6 : 4} className={styles.checkpointRing} filter={state === 'current' ? `url(#glow-${data.seed})` : undefined} />
 <circle cx={point.x} cy={point.y} r={5} fill={tone} />
 {point.kind !== 'summit' && (
 <>
 <text x={point.x + (labelOnLeft ? -24 : 24)} y={point.y - 7} textAnchor={labelOnLeft ? 'end' : 'start'} className={styles.label}>{truncate(point.title)}</text>
 <text x={point.x + (labelOnLeft ? -24 : 24)} y={point.y + 11} textAnchor={labelOnLeft ? 'end' : 'start'} className={styles.labelMeta}>{point.kind === 'start' ? 'Journey begins' : `${point.completedTaskCount}/${point.taskCount} tasks · effort ${point.effort} · ${state}`}</text>
 </>
 )}
 </g>
 );
 return href ? <a key={point.id} href={href} className={styles.checkpointLink} aria-label={`Open ${point.title}`}>{content}</a> : <g key={point.id}>{content}</g>;
 })}

 <MovingCharacter key={`${goal.id}:${animalId}`} point={characterPoint} startPoint={startPoint} replayKey={replayKey} forceReducedMotion={forceReducedMotion} animalId={animalId} />
 </svg>
 </div>

 <div className={styles.mapFooter}>
 <div className={styles.legend}>
 {[
 ['var(--viz-completed)', 'Completed camp'],
 ['var(--viz-current)', 'Current climb'],
 ['var(--viz-available)', 'Available'],
 ['var(--viz-locked)', 'Locked'],
 ].map(([tone, label]) => (
 <span className={styles.legendItem} key={label}><span className={styles.legendDot} style={{ background: tone }} />{label}</span>
 ))}
 </div>
 <div className="text-right text-xs text-muted-foreground">
 <strong className="block text-sm text-foreground">Character prototype</strong>
 PNG sprite animation · Framer Motion position
 </div>
 </div>
 <nav className={styles.campStrip} aria-label="Journey checkpoints">
 {data.checkpoints.slice(1).map((point, checkpointIndex) => {
 const index = checkpointIndex + 1;
 const previousComplete = data.checkpoints.slice(0, index).every((candidate) => candidate.completed || candidate.kind === 'start');
 const state = checkpointState(point, currentMilestone?.id, previousComplete);
 const href = point.kind === 'milestone' ? `/milestone/${point.id}` : `/goal/${goal.id}`;
 return (
 <a key={point.id} href={href} className={styles.campCard} data-state={state}>
 <span className={styles.campIndex}>{String(index).padStart(2, '0')}</span>
 <span className={styles.campText}>
 <strong>{point.title}</strong>
 <small>{point.kind === 'summit' ? 'Summit' : `${point.completedTaskCount}/${point.taskCount} tasks · effort ${point.effort}`} · {state}</small>
 </span>
 </a>
 );
 })}
 </nav>
 </div>
 );
};
