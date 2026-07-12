import { GoalItem, StatusType, TaskItem } from './types';

export const MOUNTAIN_VIEWBOX = { width: 1200, height: 720 } as const;

const MOUNTAIN_PEAK_Y = 72;
const ROUTE_ARC = 28;

export type JourneyPointKind = 'start' | 'milestone' | 'summit';

export interface JourneyPoint {
 id: string;
 title: string;
 kind: JourneyPointKind;
 x: number;
 y: number;
 completed: boolean;
 taskCount: number;
 completedTaskCount: number;
 effort: number;
}

export interface JourneyStep {
 id: string;
 title: string;
 x: number;
 y: number;
 completed: boolean;
 milestoneId: string;
}

export interface MountainMapData {
 seed: number;
 peakX: number;
 checkpoints: JourneyPoint[];
 taskSteps: JourneyStep[];
 routePath: string;
 mountainPath: string;
 distantMountainPath: string;
 farMountainPath: string;
 snowPath: string;
 stars: Array<{ x: number; y: number; radius: number; opacity: number }>;
}

interface MountainCoordinate {
 x: number;
 y: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const hashJourneySeed = (value: string): number => {
 let hash = 2166136261;
 for (let index = 0; index < value.length; index += 1) {
 hash ^= value.charCodeAt(index);
 hash = Math.imul(hash, 16777619);
 }
 return hash >>> 0;
};

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

const isComplete = (status: StatusType) => status === StatusType.FINISHED || status === StatusType.CLOSED;
const isStructuralTask = (task: TaskItem) => task.kind !== 'routine';

export const calculateJourneyEffort = (tasks: TaskItem[] = []) => Math.max(
 1,
 tasks
 .filter(isStructuralTask)
 .reduce((total, task) => total + 1 + (task.subtasks?.length ?? 0), 0),
);

const softenJourneyEffort = (effort: number) => 1.5 + Math.sqrt(effort);

const formatPoint = ({ x, y }: MountainCoordinate) => `${x.toFixed(1)} ${y.toFixed(1)}`;

const pointOnSegmentAtY = (from: MountainCoordinate, to: MountainCoordinate, y: number): MountainCoordinate => {
 const ratio = (y - from.y) / (to.y - from.y);
 return { x: from.x + (to.x - from.x) * ratio, y };
};

const leftSnowBoundary = (surface: MountainCoordinate[], snowLineY: number) => {
 for (let index = surface.length - 2; index >= 0; index -= 1) {
 const from = surface[index];
 const to = surface[index + 1];
 if (from.y >= snowLineY && to.y <= snowLineY) {
 return [pointOnSegmentAtY(from, to, snowLineY), ...surface.slice(index + 1)];
 }
 }
 return [surface.at(-1)!];
};

const rightSnowBoundary = (surface: MountainCoordinate[], snowLineY: number) => {
 for (let index = 0; index < surface.length - 1; index += 1) {
 const from = surface[index];
 const to = surface[index + 1];
 if (from.y <= snowLineY && to.y >= snowLineY) {
 return [...surface.slice(0, index + 1), pointOnSegmentAtY(from, to, snowLineY)];
 }
 }
 return [surface[0]];
};

const buildBackgroundRange = (
 random: () => number,
 baseY: number,
 peakCount: number,
 peakYMin: number,
 peakYMax: number,
) => {
 const startX = -70;
 const endX = 1270;
 const span = (endX - startX) / peakCount;
 const points: MountainCoordinate[] = [{ x: startX, y: 720 }, { x: startX, y: baseY }];

 for (let index = 0; index < peakCount; index += 1) {
 const segmentStart = startX + span * index;
 const peakX = segmentStart + span * (0.28 + random() * 0.22);
 const valleyX = segmentStart + span * (0.68 + random() * 0.18);
 points.push(
 { x: peakX, y: peakYMin + random() * (peakYMax - peakYMin) },
 { x: valleyX, y: baseY - 12 - random() * 48 },
 );
 }

 points.push({ x: endX, y: baseY }, { x: endX, y: 720 });
 return `M ${points.map(formatPoint).join(' L ')} Z`;
};

const curvePoint = (from: JourneyPoint, to: JourneyPoint, ratio: number, arc = ROUTE_ARC) => {
 const inverseRatio = 1 - ratio;
 const controlX = (from.x + to.x) / 2;
 const controlY = (from.y + to.y) / 2 - arc * 2;

 return {
 x: inverseRatio ** 2 * from.x + 2 * inverseRatio * ratio * controlX + ratio ** 2 * to.x,
 y: inverseRatio ** 2 * from.y + 2 * inverseRatio * ratio * controlY + ratio ** 2 * to.y,
 };
};

const buildRoutePath = (points: JourneyPoint[]) => points.reduce((path, point, index) => {
 if (index === 0) return `M ${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
 const previous = points[index - 1];
 const midX = (previous.x + point.x) / 2;
 const midY = (previous.y + point.y) / 2 - ROUTE_ARC * 2;
 return `${path} Q ${midX.toFixed(1)} ${midY.toFixed(1)} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
}, '');

export const pointAtJourneyProgress = (points: JourneyPoint[], progress: number) => {
 if (points.length === 0) return { x: 0, y: 0 };
 if (points.length === 1) return { x: points[0].x, y: points[0].y };
 const normalized = clamp(progress, 0, 100) / 100;
 const segmentEfforts = points.slice(1).map((point) => softenJourneyEffort(point.effort));
 const totalEffort = segmentEfforts.reduce((total, effort) => total + effort, 0);
 const targetEffort = normalized * totalEffort;
 let consumedEffort = 0;
 let segment = segmentEfforts.length - 1;
 for (let index = 0; index < segmentEfforts.length; index += 1) {
 if (targetEffort <= consumedEffort + segmentEfforts[index]) {
 segment = index;
 break;
 }
 consumedEffort += segmentEfforts[index];
 }
 const ratio = normalized === 1
 ? 1
 : clamp((targetEffort - consumedEffort) / segmentEfforts[segment], 0, 1);
 return curvePoint(points[segment], points[segment + 1], ratio);
};

export const generateMountainMap = (goal: GoalItem): MountainMapData => {
 const seed = hashJourneySeed(`${goal.id}:${goal.title}:${goal.milestones?.length ?? 0}`);
 const random = seededRandom(seed);
 const peakX = 500 + random() * 220;
 const startX = 105 + random() * 90;
 const startY = 625;
 const milestones = [...(goal.milestones ?? [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
 const milestoneTasks = milestones.map((milestone) => (milestone.tasks ?? []).filter(isStructuralTask));
 const goalTasks = (goal.tasks ?? []).filter(isStructuralTask);
 const rawSegmentEfforts = [
 ...milestoneTasks.map((tasks) => calculateJourneyEffort(tasks)),
 calculateJourneyEffort(goalTasks),
 ];
 const segmentEfforts = rawSegmentEfforts.map(softenJourneyEffort);
 const totalJourneyEffort = segmentEfforts.reduce((total, effort) => total + effort, 0);
 let accumulatedJourneyEffort = 0;
 const checkpoints: JourneyPoint[] = [{
 id: `${goal.id}:base`,
 title: 'Base camp',
 kind: 'start',
 x: startX,
 y: startY,
 completed: true,
 taskCount: 0,
 completedTaskCount: 0,
 effort: 0,
 }];

 milestones.forEach((milestone, index) => {
 accumulatedJourneyEffort += segmentEfforts[index];
 const ascent = accumulatedJourneyEffort / totalJourneyEffort;
 const centerX = startX + (peakX - startX) * ascent;
 const alternating = index % 2 === 0 ? 1 : -1;
 const remainingWidth = 180 * (1 - ascent) + 42;
 const x = clamp(centerX + alternating * remainingWidth * (0.55 + random() * 0.35), 105, 1095);
 const y = startY - ascent * 475 + (random() - 0.5) * 18;
 const tasks = milestoneTasks[index];
 checkpoints.push({
 id: milestone.id,
 title: milestone.title,
 kind: 'milestone',
 x,
 y,
 completed: isComplete(milestone.status),
 taskCount: tasks.length,
 completedTaskCount: tasks.filter((task) => isComplete(task.status)).length,
 effort: rawSegmentEfforts[index],
 });
 });

 checkpoints.push({
 id: goal.id,
 title: goal.title,
 kind: 'summit',
 x: peakX,
 y: MOUNTAIN_PEAK_Y,
 completed: isComplete(goal.status),
 taskCount: milestoneTasks.reduce((sum, tasks) => sum + tasks.length, 0) + goalTasks.length,
 completedTaskCount: milestoneTasks.reduce((sum, tasks) => sum + tasks.filter((task) => isComplete(task.status)).length, 0)
 + goalTasks.filter((task) => isComplete(task.status)).length,
 effort: rawSegmentEfforts.at(-1) ?? 1,
 });

 const taskSteps: JourneyStep[] = [];
 milestones.forEach((milestone, milestoneIndex) => {
 const from = checkpoints[milestoneIndex];
 const to = checkpoints[milestoneIndex + 1];
 const tasks = milestoneTasks[milestoneIndex];
 tasks.forEach((task, taskIndex) => {
 const ratio = (taskIndex + 1) / (tasks.length + 1);
 const point = curvePoint(from, to, ratio);
 taskSteps.push({
 id: task.id,
 title: task.title,
 x: point.x,
 y: point.y,
 completed: isComplete(task.status),
 milestoneId: milestone.id,
 });
 });
 });
 if (goalTasks.length > 0) {
 const from = checkpoints.at(-2) ?? checkpoints[0];
 const to = checkpoints.at(-1) ?? checkpoints[0];
 goalTasks.forEach((task, taskIndex) => {
 const ratio = (taskIndex + 1) / (goalTasks.length + 1);
 const point = curvePoint(from, to, ratio);
 taskSteps.push({
 id: task.id,
 title: task.title,
 x: point.x,
 y: point.y,
 completed: isComplete(task.status),
 milestoneId: goal.id,
 });
 });
 }

 const leftRidges: MountainCoordinate[] = Array.from({ length: 5 }, (_, index) => {
 const ascent = index / 5;
 return {
 x: 45 + (peakX - 45) * ascent + (random() - 0.5) * 65,
 y: 650 - ascent * 530 + random() * 35,
 };
 });
 const rightRidges: MountainCoordinate[] = Array.from({ length: 5 }, (_, index) => {
 const descent = (index + 1) / 5;
 return {
 x: peakX + (1160 - peakX) * descent + (random() - 0.5) * 70,
 y: 120 + descent * 530 + random() * 30,
 };
 });
 const summit = { x: peakX, y: MOUNTAIN_PEAK_Y };
 const leftSurface = [{ x: 20, y: 680 }, ...leftRidges, summit];
 const rightSurface = [summit, ...rightRidges, { x: 1180, y: 680 }];
 const mountainOutline = [...leftSurface, ...rightSurface.slice(1)];
 const mountainPath = `M ${mountainOutline.map(formatPoint).join(' L ')} Z`;
 const backgroundRandom = seededRandom(seed ^ 0x9e3779b9);
 const distantMountainPath = buildBackgroundRange(backgroundRandom, 645, 3, 350, 485);
 const farMountainPath = buildBackgroundRange(backgroundRandom, 680, 2, 290, 445);
 const snowLineY = 260;
 const leftSnow = leftSnowBoundary(leftSurface, snowLineY);
 const rightSnow = rightSnowBoundary(rightSurface, snowLineY);
 const leftSnowEdge = leftSnow[0];
 const rightSnowEdge = rightSnow.at(-1)!;
 const snowWidth = rightSnowEdge.x - leftSnowEdge.x;
 const snowDepth = 44;
 const snowInterior = [
 { x: rightSnowEdge.x - snowWidth * 0.18, y: snowLineY + snowDepth * 0.38 },
 { x: peakX + snowWidth * 0.14, y: snowLineY + snowDepth },
 { x: peakX - snowWidth * 0.13, y: snowLineY + snowDepth * 0.58 },
 { x: leftSnowEdge.x + snowWidth * 0.2, y: snowLineY + snowDepth * 0.9 },
 ];
 const snowOutline = [...leftSnow, ...rightSnow.slice(1), ...snowInterior];
 const snowPath = `M ${snowOutline.map(formatPoint).join(' L ')} Z`;
 const stars = Array.from({ length: 24 }, () => ({
 x: 30 + random() * 1140,
 y: 24 + random() * 250,
 radius: 0.8 + random() * 1.8,
 opacity: 0.28 + random() * 0.58,
 }));

 return {
 seed,
 peakX,
 checkpoints,
 taskSteps,
 routePath: buildRoutePath(checkpoints),
 mountainPath,
 distantMountainPath,
 farMountainPath,
 snowPath,
 stars,
 };
};
