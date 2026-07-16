import { describe, expect, it } from 'vitest';
import {
 calculateJourneyEffort,
 generateJourneyMap,
 generateMountainMap,
 locateJourneyDisplayProgress,
 locateJourneyProgress,
 pointAtJourneyProgress,
 selectJourneyIndices,
 smoothJourneyRoute,
} from './mountainMap';
import { JOURNEY_THEMES } from './journeyThemes';
import { GoalItem, PriorityType, StatusType } from './types';

const goal = (id = 'goal-a'): GoalItem => ({
 id,
 title: `Mountain ${id}`,
 description: '',
 priority: PriorityType.MEDIUM,
 status: StatusType.IN_PROGRESS,
 tasks: [
 { id: `${id}-goal-task`, title: 'Final preparation', description: '', priority: PriorityType.MEDIUM, status: StatusType.OUTSTANDING, kind: 'project', scope: 'goal', todos: [], subtasks: [] },
 { id: `${id}-routine`, title: 'Daily routine', description: '', priority: PriorityType.MEDIUM, status: StatusType.STARTED, kind: 'routine', scope: 'goal', todos: [], subtasks: [] },
 ],
 milestones: [
 {
 id: `${id}-m1`,
 title: 'First pass',
 description: '',
 priority: PriorityType.MEDIUM,
 status: StatusType.FINISHED,
 position: 1,
 tasks: [
 { id: `${id}-t1`, title: 'Step', description: '', priority: PriorityType.MEDIUM, status: StatusType.FINISHED, todos: [], subtasks: [] },
 ],
 },
 {
 id: `${id}-m2`,
 title: 'High camp',
 description: '',
 priority: PriorityType.MEDIUM,
 status: StatusType.IN_PROGRESS,
 position: 2,
 tasks: [
 { id: `${id}-t2`, title: 'Climb', description: '', priority: PriorityType.MEDIUM, status: StatusType.OUTSTANDING, todos: [], subtasks: [] },
 ],
 },
 ],
});

describe('mountain map generator', () => {
 it('is deterministic for the same goal and different across goals', () => {
 expect(generateMountainMap(goal())).toEqual(generateMountainMap(goal()));
 expect(generateMountainMap(goal('goal-b')).seed).not.toBe(generateMountainMap(goal()).seed);
 });

 it('creates base, milestone checkpoints, summit, and task steps from live data', () => {
 const map = generateMountainMap(goal());
 expect(map.checkpoints).toHaveLength(4);
 expect(map.checkpoints[1]).toMatchObject({ title: 'First pass', completed: true, taskCount: 1, completedTaskCount: 1 });
 expect(map.taskSteps).toHaveLength(3);
 expect(map.taskSteps.some((step) => step.id.endsWith('-routine'))).toBe(false);
 expect(map.routePath.startsWith('M ')).toBe(true);
 expect(map.routePath.endsWith(`${map.checkpoints.at(-1)?.x.toFixed(1)} ${map.checkpoints.at(-1)?.y.toFixed(1)}`)).toBe(true);
 expect(map.routeSegments).toHaveLength(map.checkpoints.length - 1);
 expect(map.routeSegments[0]).toMatchObject({
 fromId: map.checkpoints[0].id,
 toId: map.checkpoints[1].id,
 });
 expect(map.theme.id).toBe('mountain');
 expect(map.route).toHaveLength(JOURNEY_THEMES.mountain.route.length);
 expect(map.route).not.toEqual(JOURNEY_THEMES.mountain.route);
 expect(map.terrainProfile).toEqual({ milestoneCount: 2, taskCount: 3, effort: 3 });
 });

 it('keeps progress positions on the generated journey', () => {
 const map = generateMountainMap(goal());
 expect(pointAtJourneyProgress(map.checkpoints, 0)).toEqual({ x: map.checkpoints[0].x, y: map.checkpoints[0].y });
 expect(pointAtJourneyProgress(map.checkpoints, 100)).toEqual({ x: map.checkpoints.at(-1)?.x, y: map.checkpoints.at(-1)?.y });
 const halfway = pointAtJourneyProgress(map.checkpoints, 50);
 expect(halfway.y).toBeLessThan(map.checkpoints[0].y);
 });

 it('uses one shared generator for all themes and keeps ocean descending', () => {
 const mountain = generateJourneyMap(goal(), JOURNEY_THEMES.mountain);
 const ocean = generateJourneyMap(goal(), JOURNEY_THEMES.ocean);

 expect(mountain.checkpoints.map((point) => point.id)).toEqual(ocean.checkpoints.map((point) => point.id));
 expect(mountain.route).not.toEqual(ocean.route);
 expect(mountain.checkpoints[0].y).toBeGreaterThan(mountain.checkpoints.at(-1)!.y);
 expect(ocean.checkpoints[0].y).toBeLessThan(ocean.checkpoints.at(-1)!.y);
 expect(ocean.theme.direction).toBe('down');
 });

 it('generates a stable route per goal but changes it with effort structure', () => {
 const original = generateJourneyMap(goal('generated'), JOURNEY_THEMES['world-tree']);
 const changedGoal = goal('generated');
 changedGoal.milestones[0].tasks[0].subtasks = [{
 id: 'extra-effort',
 title: 'Extra effort',
 description: '',
 priority: PriorityType.MEDIUM,
 status: StatusType.OUTSTANDING,
 task_id: changedGoal.milestones[0].tasks[0].id,
 }];
 const changed = generateJourneyMap(changedGoal, JOURNEY_THEMES['world-tree']);

 expect(generateJourneyMap(goal('generated'), JOURNEY_THEMES['world-tree']).route).toEqual(original.route);
 expect(changed.route).not.toEqual(original.route);
 });

 it('moves to the next route segment at an exact effort boundary', () => {
 const map = generateMountainMap(goal());
 const efforts = map.checkpoints.slice(1).map((point) => 1.5 + Math.sqrt(point.effort));
 const boundary = (efforts[0] / efforts.reduce((total, effort) => total + effort, 0)) * 100;
 const location = locateJourneyProgress(map.checkpoints, boundary);

 expect(location.segmentIndex).toBe(1);
 expect(location.ratio).toBeCloseTo(0, 5);
 expect(location.point).toEqual({ x: map.checkpoints[1].x, y: map.checkpoints[1].y });
 });

 it('never renders the character below the last consecutively completed milestone', () => {
 const completedGoal = goal('completed-floor');
 completedGoal.milestones[1].status = StatusType.FINISHED;
 completedGoal.milestones[1].tasks[0].status = StatusType.FINISHED;
 const map = generateMountainMap(completedGoal);
 const rawLocation = locateJourneyProgress(map.checkpoints, 20, map.route);
 const displayLocation = locateJourneyDisplayProgress(map.checkpoints, 20, map.route);
 const lastCompletedMilestone = map.checkpoints[2];

 expect(rawLocation.routeRatio).toBeLessThan(lastCompletedMilestone.routeRatio);
 expect(displayLocation.routeRatio).toBe(lastCompletedMilestone.routeRatio);
 expect(displayLocation.point).toEqual({
 x: lastCompletedMilestone.x,
 y: lastCompletedMilestone.y,
 });
 expect(displayLocation.segmentIndex).toBe(2);
 expect(displayLocation.ratio).toBe(0);
 });

 it('keeps real progress when it is already above completed milestones', () => {
 const completedGoal = goal('advanced-progress');
 completedGoal.milestones[1].status = StatusType.FINISHED;
 const map = generateMountainMap(completedGoal);
 const rawLocation = locateJourneyProgress(map.checkpoints, 95, map.route);
 const displayLocation = locateJourneyDisplayProgress(map.checkpoints, 95, map.route);

 expect(displayLocation).toEqual(rawLocation);
 });

 it('allocates more distance to milestones with more structural work', () => {
 const weightedGoal = goal('weighted');
 const firstTask = weightedGoal.milestones[0].tasks[0];
 firstTask.subtasks = Array.from({ length: 8 }, (_, index) => ({
 id: `weighted-subtask-${index}`,
 title: `Step ${index + 1}`,
 description: '',
 priority: PriorityType.MEDIUM,
 status: StatusType.OUTSTANDING,
 task_id: firstTask.id,
 }));

 const map = generateMountainMap(weightedGoal);
 const firstSegmentGain = map.checkpoints[1].routeRatio - map.checkpoints[0].routeRatio;
 const secondSegmentGain = map.checkpoints[2].routeRatio - map.checkpoints[1].routeRatio;
 expect(calculateJourneyEffort([firstTask])).toBe(9);
 expect(firstSegmentGain).toBeGreaterThan(secondSegmentGain);
 expect(map.checkpoints[1].effort).toBe(9);
 });

 it('keeps switchback complexity stable when a goal has many milestones', () => {
 const shortMap = generateMountainMap(goal('short-route'));
 const longGoal = goal('long-route');
 longGoal.milestones = Array.from({ length: 100 }, (_, index) => ({
 id: `long-milestone-${index}`,
 title: `Camp ${index + 1}`,
 description: '',
 priority: PriorityType.MEDIUM,
 status: StatusType.OUTSTANDING,
 position: index + 1,
 tasks: [{
 id: `long-task-${index}`,
 title: `Climb ${index + 1}`,
 description: '',
 priority: PriorityType.MEDIUM,
 status: StatusType.OUTSTANDING,
 todos: [],
 subtasks: [],
 }],
 }));
 const longMap = generateMountainMap(longGoal);

 expect(longMap.route).toHaveLength(shortMap.route.length);
 expect(longMap.route).toHaveLength(JOURNEY_THEMES.mountain.route.length);
 expect(longMap.terrainProfile.milestoneCount).toBe(100);
 expect(longMap.checkpoints).toHaveLength(102);
 expect(longMap.presentation).toMatchObject({
 density: 'clustered',
 cameraMode: 'far',
 cameraPullback: 1,
 maxVisibleCheckpoints: 20,
 maxVisibleTaskSteps: 32,
 });
 const routeXs = longMap.route.map((point) => point.x);
 expect(Math.max(...routeXs) - Math.min(...routeXs)).toBeGreaterThan(700);
 const destinationX = longMap.route.at(-1)!.x;
 longMap.route.slice(1, -1).forEach((point, index) => {
 const ratio = (index + 1) / (longMap.route.length - 1);
 const halfWidth = (500 * ((1 - ratio) ** 1.2)) + 18;
 const margin = 20 + (ratio * 8);
 expect(point.x).toBeGreaterThanOrEqual(destinationX - halfWidth + margin);
 expect(point.x).toBeLessThanOrEqual(destinationX + halfWidth - margin);
 });
 expect(longMap.route[0].y).toBeGreaterThan(longMap.route.at(-1)!.y);
 });

 it('caps dense marker selections while preserving required checkpoints', () => {
 const selected = selectJourneyIndices(102, 20, [0, 37, 101]);

 expect(selected.size).toBeLessThanOrEqual(20);
 expect(selected.has(0)).toBe(true);
 expect(selected.has(37)).toBe(true);
 expect(selected.has(101)).toBe(true);
 });

 it('rounds switchback corners without changing endpoints or leaving their bounds', () => {
 const controls = [{ x: 0, y: 100 }, { x: 50, y: 0 }, { x: 100, y: 100 }];
 const smoothed = smoothJourneyRoute(controls);

 expect(smoothed.length).toBeGreaterThan(controls.length);
 expect(smoothed[0]).toEqual(controls[0]);
 expect(smoothed.at(-1)).toEqual(controls.at(-1));
 expect(smoothed).not.toContainEqual(controls[1]);
 expect(smoothed.every((point) => point.x >= 0 && point.x <= 100 && point.y >= 0 && point.y <= 100)).toBe(true);
 });

 it('pulls back and widens the trail for task-heavy goals with few milestones', () => {
 const taskHeavyGoal = goal('task-heavy');
 taskHeavyGoal.milestones.forEach((milestone, milestoneIndex) => {
 milestone.tasks = Array.from({ length: 160 }, (_, taskIndex) => ({
 id: `task-heavy-${milestoneIndex}-${taskIndex}`,
 title: `Task ${taskIndex + 1}`,
 description: '',
 priority: PriorityType.MEDIUM,
 status: StatusType.OUTSTANDING,
 todos: [],
 subtasks: [],
 }));
 });

 const map = generateMountainMap(taskHeavyGoal);
 const routeXs = map.route.map((point) => point.x);

 expect(map.terrainProfile.milestoneCount).toBe(2);
 expect(map.terrainProfile.taskCount).toBe(321);
 expect(map.presentation.cameraMode).toBe('far');
 expect(map.presentation.cameraPullback).toBe(1);
 expect(map.presentation.maxVisibleTaskSteps).toBe(48);
 expect(Math.max(...routeXs) - Math.min(...routeXs)).toBeGreaterThan(700);
 });
});
