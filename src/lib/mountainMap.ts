import { GoalItem, StatusType, TaskItem } from './types';

export const MOUNTAIN_VIEWBOX = { width: 1200, height: 720 } as const;

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
 farMountainPath: string;
 snowPath: string;
 stars: Array<{ x: number; y: number; radius: number; opacity: number }>;
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

const curvePoint = (from: JourneyPoint, to: JourneyPoint, ratio: number, arc = 24) => ({
 x: from.x + (to.x - from.x) * ratio,
 y: from.y + (to.y - from.y) * ratio - Math.sin(Math.PI * ratio) * arc,
});

const buildRoutePath = (points: JourneyPoint[]) => points.reduce((path, point, index) => {
 if (index === 0) return `M ${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
 const previous = points[index - 1];
 const midX = (previous.x + point.x) / 2;
 const midY = (previous.y + point.y) / 2 - 28;
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
 return curvePoint(points[segment], points[segment + 1], ratio, 28);
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
 y: 92,
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
 const point = curvePoint(from, to, ratio, 28);
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
 const point = curvePoint(from, to, ratio, 34);
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

 const leftRidges = Array.from({ length: 5 }, (_, index) => {
 const ascent = index / 5;
 return `${(45 + (peakX - 45) * ascent + (random() - 0.5) * 65).toFixed(1)} ${(650 - ascent * 530 + random() * 35).toFixed(1)}`;
 });
 const rightRidges = Array.from({ length: 5 }, (_, index) => {
 const descent = (index + 1) / 5;
 return `${(peakX + (1160 - peakX) * descent + (random() - 0.5) * 70).toFixed(1)} ${(120 + descent * 530 + random() * 30).toFixed(1)}`;
 });
 const mountainPath = `M 20 680 L ${leftRidges.join(' L ')} L ${peakX.toFixed(1)} 72 L ${rightRidges.join(' L ')} L 1180 680 Z`;
 const farPeak = 230 + random() * 650;
 const farMountainPath = `M 0 665 L ${Math.max(40, farPeak - 360).toFixed(1)} 430 L ${farPeak.toFixed(1)} 245 L ${(farPeak + 330).toFixed(1)} 475 L 1200 630 L 1200 720 L 0 720 Z`;
 const snowPath = `M ${(peakX - 118).toFixed(1)} 176 L ${peakX.toFixed(1)} 72 L ${(peakX + 122).toFixed(1)} 190 L ${(peakX + 70).toFixed(1)} 170 L ${(peakX + 26).toFixed(1)} 201 L ${(peakX - 16).toFixed(1)} 160 L ${(peakX - 58).toFixed(1)} 194 Z`;
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
 farMountainPath,
 snowPath,
 stars,
 };
};
