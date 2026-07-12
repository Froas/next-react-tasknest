import { describe, expect, it } from 'vitest';
import { calculateJourneyEffort, generateMountainMap, pointAtJourneyProgress } from './mountainMap';
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
 expect(generateMountainMap(goal('goal-b')).mountainPath).not.toBe(generateMountainMap(goal()).mountainPath);
 expect(generateMountainMap(goal('goal-b')).distantMountainPath).not.toBe(generateMountainMap(goal()).distantMountainPath);
 });

 it('creates base, milestone checkpoints, summit, and task steps from live data', () => {
 const map = generateMountainMap(goal());
 expect(map.checkpoints).toHaveLength(4);
 expect(map.checkpoints[1]).toMatchObject({ title: 'First pass', completed: true, taskCount: 1, completedTaskCount: 1 });
 expect(map.taskSteps).toHaveLength(3);
 expect(map.taskSteps.some((step) => step.id.endsWith('-routine'))).toBe(false);
 expect(map.routePath.startsWith('M ')).toBe(true);
 expect(map.routePath.endsWith(`${map.checkpoints.at(-1)?.x.toFixed(1)} ${map.checkpoints.at(-1)?.y.toFixed(1)}`)).toBe(true);
 expect(map.mountainPath).toContain(`L ${map.peakX.toFixed(1)} ${map.checkpoints.at(-1)?.y.toFixed(1)} L`);
 });

 it('keeps progress positions on the generated journey', () => {
 const map = generateMountainMap(goal());
 expect(pointAtJourneyProgress(map.checkpoints, 0)).toEqual({ x: map.checkpoints[0].x, y: map.checkpoints[0].y });
 expect(pointAtJourneyProgress(map.checkpoints, 100)).toEqual({ x: map.checkpoints.at(-1)?.x, y: map.checkpoints.at(-1)?.y });
 const halfway = pointAtJourneyProgress(map.checkpoints, 50);
 expect(halfway.y).toBeLessThan(map.checkpoints[0].y);
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
 const firstSegmentGain = map.checkpoints[0].y - map.checkpoints[1].y;
 const secondSegmentGain = map.checkpoints[1].y - map.checkpoints[2].y;
 expect(calculateJourneyEffort([firstTask])).toBe(9);
 expect(firstSegmentGain).toBeGreaterThan(secondSegmentGain);
 expect(map.checkpoints[1].effort).toBe(9);
 });
});
