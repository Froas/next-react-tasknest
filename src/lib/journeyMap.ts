import { JourneyPoint as ThemePoint, JourneyTheme, getJourneyTheme } from './journeyThemes';
import { JourneyTerrainProfile } from './journeyEnvironments';
import { GoalItem, StatusType, TaskItem } from './types';

export const JOURNEY_VIEWBOX = { width: 1200, height: 720 } as const;

export type JourneyPointKind = 'start' | 'milestone' | 'goal';

export interface JourneyCheckpoint {
 id: string;
 title: string;
 kind: JourneyPointKind;
 x: number;
 y: number;
 routeRatio: number;
 completed: boolean;
 taskCount: number;
 completedTaskCount: number;
 effort: number;
}

export interface JourneyTaskStep {
 id: string;
 title: string;
 x: number;
 y: number;
 completed: boolean;
 milestoneId: string;
}

export interface JourneyRouteSegment {
 id: string;
 fromId: string;
 toId: string;
 path: string;
 effort: number;
}

export interface JourneyProgressLocation {
 segmentIndex: number;
 ratio: number;
 point: ThemePoint;
 routeRatio: number;
}

export interface JourneyMapData {
 seed: number;
 theme: JourneyTheme;
 checkpoints: JourneyCheckpoint[];
 taskSteps: JourneyTaskStep[];
 routePath: string;
 routeSegments: JourneyRouteSegment[];
 route: ThemePoint[];
 decorations: JourneyDecoration[];
 terrainProfile: JourneyTerrainProfile;
 presentation: JourneyPresentation;
}

export type JourneyDensity = 'full' | 'compact' | 'dense' | 'clustered';
export type JourneyCameraMode = 'near' | 'mid' | 'far';

export interface JourneyPresentation {
 density: JourneyDensity;
 cameraMode: JourneyCameraMode;
 cameraPullback: number;
 maxVisibleCheckpoints: number;
 maxVisibleTaskSteps: number;
}

export type JourneyDecorationKind = 'speck' | 'spark' | 'bubble' | 'leaf' | 'ember';

export interface JourneyDecoration extends ThemePoint {
 id: string;
 kind: JourneyDecorationKind;
 size: number;
 opacity: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const isComplete = (status: StatusType) => status === StatusType.FINISHED || status === StatusType.CLOSED;
const isStructuralTask = (task: TaskItem) => task.kind !== 'routine';

const journeyCameraPullback = (milestoneCount: number, taskCount: number) => Math.max(
 clamp((milestoneCount - 6) / 18, 0, 1),
 clamp((taskCount - 48) / 240, 0, 1),
);

const visibleTaskStepLimit = (taskCount: number) => {
 if (taskCount <= 64) return taskCount;
 if (taskCount <= 192) return 72;
 if (taskCount <= 512) return 48;
 return 32;
};

export const getJourneyPresentation = (
 milestoneCount: number,
 taskCount: number,
): JourneyPresentation => {
 const cameraMode: JourneyCameraMode = milestoneCount <= 6 && taskCount <= 48
 ? 'near'
 : milestoneCount <= 16 && taskCount <= 192
 ? 'mid'
 : 'far';
 const cameraPullback = journeyCameraPullback(milestoneCount, taskCount);
 const maxVisibleTaskSteps = visibleTaskStepLimit(taskCount);

 if (milestoneCount <= 8) {
 return {
 density: 'full',
 cameraMode,
 cameraPullback,
 maxVisibleCheckpoints: milestoneCount + 2,
 maxVisibleTaskSteps,
 };
 }
 if (milestoneCount <= 20) {
 return {
 density: 'compact',
 cameraMode,
 cameraPullback,
 maxVisibleCheckpoints: milestoneCount + 2,
 maxVisibleTaskSteps: Math.min(72, maxVisibleTaskSteps),
 };
 }
 if (milestoneCount <= 40) {
 return {
 density: 'dense',
 cameraMode,
 cameraPullback,
 maxVisibleCheckpoints: 24,
 maxVisibleTaskSteps: Math.min(48, maxVisibleTaskSteps),
 };
 }
 return {
 density: 'clustered',
 cameraMode,
 cameraPullback,
 maxVisibleCheckpoints: 20,
 maxVisibleTaskSteps: Math.min(32, maxVisibleTaskSteps),
 };
};

export const selectJourneyIndices = (
 itemCount: number,
 maxVisible: number,
 requiredIndices: number[] = [],
): Set<number> => {
 if (itemCount <= 0 || maxVisible <= 0) return new Set();
 if (itemCount <= maxVisible) {
 return new Set(Array.from({ length: itemCount }, (_, index) => index));
 }

 const selected = new Set(requiredIndices.filter((index) => index >= 0 && index < itemCount));
 const availableSlots = Math.max(0, maxVisible - selected.size);
 if (availableSlots === 0) return selected;

 for (let slot = 0; slot < availableSlots; slot += 1) {
 const ratio = availableSlots === 1 ? 0.5 : slot / (availableSlots - 1);
 selected.add(Math.round(ratio * (itemCount - 1)));
 }

 // Rounding can collide with required indices. Fill the remaining capacity by
 // repeatedly choosing the point furthest from the current selection.
 while (selected.size < maxVisible) {
 let bestIndex = -1;
 let bestDistance = -1;
 for (let index = 0; index < itemCount; index += 1) {
 if (selected.has(index)) continue;
 const distance = Math.min(...Array.from(selected, (candidate) => Math.abs(candidate - index)));
 if (distance > bestDistance) {
 bestDistance = distance;
 bestIndex = index;
 }
 }
 if (bestIndex < 0) break;
 selected.add(bestIndex);
 }
 return selected;
};

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

export const calculateJourneyEffort = (tasks: TaskItem[] = []) => Math.max(
 1,
 tasks
 .filter(isStructuralTask)
 .reduce((total, task) => total + 1 + (task.subtasks?.length ?? 0), 0),
);

const softenJourneyEffort = (effort: number) => 1.5 + Math.sqrt(effort);

const generateAscentRoute = (
 theme: JourneyTheme,
 seed: number,
 profile: JourneyTerrainProfile,
): ThemePoint[] => {
 const random = seededRandom(seed ^ 0x7f4a7c15);
 const sourceStart = theme.route[0];
 const sourceDestination = theme.route.at(-1) ?? sourceStart;
 const cameraPullback = journeyCameraPullback(profile.milestoneCount, profile.taskCount);
 const start = {
 x: clamp(sourceStart.x + ((random() - 0.5) * 20), 90, 1110),
 y: sourceStart.y - (cameraPullback * 14),
 };
 const destination = {
 x: clamp(sourceDestination.x + ((random() - 0.5) * 24), 160, 1040),
 y: sourceDestination.y + (cameraPullback * 28),
 };
 // Milestones are sampled along a stable trail. They must not create a new
 // switchback each, otherwise long goals turn into a high-frequency zigzag.
 const pointCount = theme.route.length;
 const effortScale = clamp(Math.sqrt(Math.max(1, profile.effort)) / 9, 0.25, 1);
 const trailSpread = Math.max(
 clamp((profile.milestoneCount - 6) / 10, 0, 1),
 clamp((profile.taskCount - 32) / 160, 0, 1),
 );
 const amplitude = (theme.id === 'volcano' ? 122 : 154)
 + (cameraPullback * (theme.id === 'volcano' ? 92 : 138))
 + (effortScale * 16);

 return Array.from({ length: pointCount }, (_, index) => {
 if (index === 0) return start;
 if (index === pointCount - 1) return destination;
 const ratio = index / (pointCount - 1);
 const taper = Math.sin(Math.PI * ratio);
 const direction = index % 2 === 1 ? 1 : -1;
 const baselineX = start.x + ((destination.x - start.x) * ratio);
 const jitter = (random() - 0.5) * 18;
 const classicX = baselineX + (direction * amplitude * taper) + jitter;
 // Approximate the usable mountain face as a cone that is wide at the base
 // and converges toward the summit. Dense trails alternate between its sides
 // instead of increasing amplitude until they leave the mountain silhouette.
 const faceHalfWidth = ((theme.id === 'volcano' ? 440 : 500) * ((1 - ratio) ** 1.2)) + 18;
 const faceMargin = 20 + (ratio * 8);
 const slopeLeft = destination.x - faceHalfWidth + faceMargin;
 const slopeRight = destination.x + faceHalfWidth - faceMargin;
 const wideX = destination.x + (direction * faceHalfWidth * (theme.id === 'volcano' ? 0.78 : 0.86));
 const targetX = classicX + ((wideX - classicX) * trailSpread);
 return {
 x: clamp(
 targetX,
 Math.max(80, slopeLeft),
 Math.min(1120, slopeRight),
 ),
 y: clamp(start.y + ((destination.y - start.y) * ratio) + ((random() - 0.5) * 8), 55, 665),
 };
 });
};

const generateThemeRoute = (
 theme: JourneyTheme,
 seed: number,
 profile: JourneyTerrainProfile,
): ThemePoint[] => {
 if (theme.id === 'mountain' || theme.id === 'volcano') {
 return generateAscentRoute(theme, seed, profile);
 }
 const random = seededRandom(seed);
 const horizontalVariance = theme.id === 'cosmic' ? 62 : theme.id === 'ocean' ? 46 : 38;
 const verticalVariance = theme.direction === 'inward' ? 34 : 20;

 return theme.route.map((point, index) => {
 if (index === 0 || index === theme.route.length - 1) {
 return {
 x: clamp(point.x + ((random() - 0.5) * horizontalVariance * 0.28), 70, 1130),
 y: point.y,
 };
 }
 return {
 x: clamp(point.x + ((random() - 0.5) * horizontalVariance), 70, 1130),
 y: clamp(point.y + ((random() - 0.5) * verticalVariance), 55, 665),
 };
 });
};

const decorationKind = (theme: JourneyTheme): JourneyDecorationKind => {
 if (theme.id === 'cosmic') return 'spark';
 if (theme.id === 'ocean') return 'bubble';
 if (theme.id === 'world-tree') return 'leaf';
 if (theme.id === 'volcano') return 'ember';
 return 'speck';
};

const generateDecorations = (theme: JourneyTheme, seed: number): JourneyDecoration[] => {
 const random = seededRandom(seed ^ 0x9e3779b9);
 const kind = decorationKind(theme);
 const count = theme.id === 'cosmic' ? 22 : 14;
 return Array.from({ length: count }, (_, index) => ({
 id: `${theme.id}:decoration:${index}`,
 kind,
 x: 45 + (random() * 1110),
 y: 35 + (random() * 630),
 size: 2.5 + (random() * (kind === 'bubble' ? 9 : 5)),
 opacity: 0.22 + (random() * 0.42),
 }));
};

interface RouteMetrics {
 segmentLengths: number[];
 totalLength: number;
}

export const smoothJourneyRoute = (route: ThemePoint[], iterations = 2): ThemePoint[] => {
 if (route.length <= 2 || iterations <= 0) return route;
 let points = route;
 for (let iteration = 0; iteration < iterations; iteration += 1) {
 const next: ThemePoint[] = [points[0]];
 for (let index = 0; index < points.length - 1; index += 1) {
 const from = points[index];
 const to = points[index + 1];
 next.push(
 { x: (from.x * 0.75) + (to.x * 0.25), y: (from.y * 0.75) + (to.y * 0.25) },
 { x: (from.x * 0.25) + (to.x * 0.75), y: (from.y * 0.25) + (to.y * 0.75) },
 );
 }
 next.push(points.at(-1)!);
 points = next;
 }
 return points;
};

const smoothedRouteCache = new WeakMap<ThemePoint[], ThemePoint[]>();

const routeForSampling = (route: ThemePoint[]) => {
 const cached = smoothedRouteCache.get(route);
 if (cached) return cached;
 const smoothed = smoothJourneyRoute(route);
 smoothedRouteCache.set(route, smoothed);
 return smoothed;
};

const routeMetrics = (route: ThemePoint[]): RouteMetrics => {
 const segmentLengths = route.slice(1).map((point, index) => Math.hypot(
 point.x - route[index].x,
 point.y - route[index].y,
 ));
 return {
 segmentLengths,
 totalLength: segmentLengths.reduce((sum, length) => sum + length, 0),
 };
};

export const sampleJourneyRoute = (route: ThemePoint[], ratio: number): ThemePoint => {
 if (route.length === 0) return { x: 0, y: 0 };
 if (route.length === 1) return route[0];
 const sampledRoute = routeForSampling(route);
 const normalized = clamp(ratio, 0, 1);
 if (normalized === 0) return sampledRoute[0];
 if (normalized === 1) return sampledRoute.at(-1) ?? sampledRoute[0];
 const metrics = routeMetrics(sampledRoute);
 const target = normalized * metrics.totalLength;
 let consumed = 0;

 for (let index = 0; index < metrics.segmentLengths.length; index += 1) {
 const length = metrics.segmentLengths[index];
 const isLast = index === metrics.segmentLengths.length - 1;
 if (target <= consumed + length || isLast) {
 const localRatio = length === 0 ? 0 : clamp((target - consumed) / length, 0, 1);
 return {
 x: sampledRoute[index].x + ((sampledRoute[index + 1].x - sampledRoute[index].x) * localRatio),
 y: sampledRoute[index].y + ((sampledRoute[index + 1].y - sampledRoute[index].y) * localRatio),
 };
 }
 consumed += length;
 }

 return sampledRoute.at(-1) ?? { x: 0, y: 0 };
};

const routeSlicePath = (route: ThemePoint[], fromRatio: number, toRatio: number) => {
 const samples = Math.max(3, Math.ceil(Math.abs(toRatio - fromRatio) * 28));
 const points = Array.from({ length: samples + 1 }, (_, index) => (
 sampleJourneyRoute(route, fromRatio + ((toRatio - fromRatio) * (index / samples)))
 ));
 return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');
};

export const locateJourneyProgress = (
 points: JourneyCheckpoint[],
 progress: number,
 route?: ThemePoint[],
): JourneyProgressLocation => {
 if (points.length === 0) return { segmentIndex: 0, ratio: 0, point: { x: 0, y: 0 }, routeRatio: 0 };
 if (points.length === 1) {
 return { segmentIndex: 0, ratio: 0, point: { x: points[0].x, y: points[0].y }, routeRatio: points[0].routeRatio };
 }

 const normalized = clamp(progress, 0, 100) / 100;
 const segmentEfforts = points.slice(1).map((point) => softenJourneyEffort(point.effort));
 const totalEffort = segmentEfforts.reduce((total, effort) => total + effort, 0);
 const targetEffort = normalized * totalEffort;
 let consumedEffort = 0;
 let segmentIndex = segmentEfforts.length - 1;

 for (let index = 0; index < segmentEfforts.length; index += 1) {
 const segmentEnd = consumedEffort + segmentEfforts[index];
 if (targetEffort < segmentEnd - 1e-9 || index === segmentEfforts.length - 1) {
 segmentIndex = index;
 break;
 }
 consumedEffort += segmentEfforts[index];
 }

 const ratio = normalized === 1
 ? 1
 : clamp((targetEffort - consumedEffort) / segmentEfforts[segmentIndex], 0, 1);
 const from = points[segmentIndex];
 const to = points[segmentIndex + 1];
 const routeRatio = from.routeRatio + ((to.routeRatio - from.routeRatio) * ratio);
 const point = route
 ? sampleJourneyRoute(route, routeRatio)
 : { x: from.x + ((to.x - from.x) * ratio), y: from.y + ((to.y - from.y) * ratio) };

 return { segmentIndex, ratio, point, routeRatio };
};

export const locateJourneyDisplayProgress = (
 points: JourneyCheckpoint[],
 progress: number,
 route?: ThemePoint[],
): JourneyProgressLocation => {
 const progressLocation = locateJourneyProgress(points, progress, route);
 if (points.length <= 1) return progressLocation;

 let lastCompletedIndex = 0;
 for (let index = 1; index < points.length; index += 1) {
 if (!points[index].completed) break;
 lastCompletedIndex = index;
 }

 const completedCheckpoint = points[lastCompletedIndex];
 if (completedCheckpoint.routeRatio <= progressLocation.routeRatio + 1e-9) {
 return progressLocation;
 }

 const completedJourney = lastCompletedIndex === points.length - 1;
 const routeRatio = completedCheckpoint.routeRatio;
 return {
 segmentIndex: completedJourney ? Math.max(0, points.length - 2) : lastCompletedIndex,
 ratio: completedJourney ? 1 : 0,
 point: route
 ? sampleJourneyRoute(route, routeRatio)
 : { x: completedCheckpoint.x, y: completedCheckpoint.y },
 routeRatio,
 };
};

export const pointAtJourneyProgress = (
 points: JourneyCheckpoint[],
 progress: number,
 route?: ThemePoint[],
) => locateJourneyProgress(points, progress, route).point;

export const generateJourneyMap = (
 goal: GoalItem,
 theme: JourneyTheme = getJourneyTheme(goal.journey_theme_id),
): JourneyMapData => {
 const milestones = [...(goal.milestones ?? [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
 const milestoneTasks = milestones.map((milestone) => (milestone.tasks ?? []).filter(isStructuralTask));
 const goalTasks = (goal.tasks ?? []).filter(isStructuralTask);
 const rawSegmentEfforts = [
 ...milestoneTasks.map((tasks) => calculateJourneyEffort(tasks)),
 calculateJourneyEffort(goalTasks),
 ];
 const seed = hashJourneySeed(`${goal.id}:${theme.id}:${rawSegmentEfforts.join(',')}`);
 const terrainProfile: JourneyTerrainProfile = {
 milestoneCount: milestones.length,
 taskCount: milestoneTasks.reduce((total, tasks) => total + tasks.length, 0) + goalTasks.length,
 effort: rawSegmentEfforts.reduce((total, effort) => total + effort, 0),
 };
 const presentation = getJourneyPresentation(terrainProfile.milestoneCount, terrainProfile.taskCount);
 const route = generateThemeRoute(theme, seed, terrainProfile);
 const segmentEfforts = rawSegmentEfforts.map(softenJourneyEffort);
 const totalJourneyEffort = segmentEfforts.reduce((total, effort) => total + effort, 0);
 let accumulatedEffort = 0;

 const startPosition = sampleJourneyRoute(route, 0);
 const checkpoints: JourneyCheckpoint[] = [{
 id: `${goal.id}:start`,
 title: theme.direction === 'down' ? 'Surface' : theme.id === 'castle' ? 'Outer gate' : 'Starting point',
 kind: 'start',
 ...startPosition,
 routeRatio: 0,
 completed: true,
 taskCount: 0,
 completedTaskCount: 0,
 effort: 0,
 }];

 milestones.forEach((milestone, index) => {
 accumulatedEffort += segmentEfforts[index];
 const routeRatio = totalJourneyEffort === 0 ? 0 : accumulatedEffort / totalJourneyEffort;
 const position = sampleJourneyRoute(route, routeRatio);
 const tasks = milestoneTasks[index];
 checkpoints.push({
 id: milestone.id,
 title: milestone.title,
 kind: 'milestone',
 ...position,
 routeRatio,
 completed: isComplete(milestone.status),
 taskCount: tasks.length,
 completedTaskCount: tasks.filter((task) => isComplete(task.status)).length,
 effort: rawSegmentEfforts[index],
 });
 });

 const goalPosition = sampleJourneyRoute(route, 1);
 checkpoints.push({
 id: goal.id,
 title: goal.title,
 kind: 'goal',
 ...goalPosition,
 routeRatio: 1,
 completed: isComplete(goal.status),
 taskCount: milestoneTasks.reduce((sum, tasks) => sum + tasks.length, 0) + goalTasks.length,
 completedTaskCount: milestoneTasks.reduce((sum, tasks) => sum + tasks.filter((task) => isComplete(task.status)).length, 0)
 + goalTasks.filter((task) => isComplete(task.status)).length,
 effort: rawSegmentEfforts.at(-1) ?? 1,
 });

 const routeSegments = checkpoints.slice(1).map((point, index) => ({
 id: `${checkpoints[index].id}:${point.id}`,
 fromId: checkpoints[index].id,
 toId: point.id,
 path: routeSlicePath(route, checkpoints[index].routeRatio, point.routeRatio),
 effort: point.effort,
 }));

 const taskSteps: JourneyTaskStep[] = [];
 const appendTaskSteps = (tasks: TaskItem[], checkpointIndex: number, ownerId: string) => {
 const from = checkpoints[checkpointIndex];
 const to = checkpoints[checkpointIndex + 1];
 tasks.forEach((task, taskIndex) => {
 const taskRatio = (taskIndex + 1) / (tasks.length + 1);
 const routeRatio = from.routeRatio + ((to.routeRatio - from.routeRatio) * taskRatio);
 const position = sampleJourneyRoute(route, routeRatio);
 taskSteps.push({
 id: task.id,
 title: task.title,
 ...position,
 completed: isComplete(task.status),
 milestoneId: ownerId,
 });
 });
 };

 milestones.forEach((milestone, index) => appendTaskSteps(milestoneTasks[index], index, milestone.id));
 appendTaskSteps(goalTasks, checkpoints.length - 2, goal.id);

 return {
 seed,
 theme,
 checkpoints,
 taskSteps,
 routePath: routeSlicePath(route, 0, 1),
 routeSegments,
 route,
 decorations: generateDecorations(theme, seed),
 terrainProfile,
 presentation,
 };
};
