import { describe, expect, it } from 'vitest';
import { buildExportPayload } from './exportImport';
import { GoalItem, PriorityType, StatusType, TaskItem } from './types';

const taskWithSubtask: TaskItem = {
 id: 'task-1',
 title: 'Task',
 description: '',
 status: StatusType.OUTSTANDING,
 priority: PriorityType.LOW,
 milestone_id: 'milestone-1',
 todos: [],
 subtasks: [
 {
 id: 'subtask-1',
 title: 'Subtask',
 description: '',
 status: StatusType.OUTSTANDING,
 priority: PriorityType.LOW,
 task_id: 'task-1',
 },
 ],
};

const goal: GoalItem = {
 id: 'goal-1',
 title: 'Goal',
 description: '',
 status: StatusType.OUTSTANDING,
 priority: PriorityType.HIGH,
 completion_rule: { type: 'structural' },
 tasks: [
 {
 id: 'routine-1',
 title: 'Routine',
 description: '',
 status: StatusType.STARTED,
 priority: PriorityType.MEDIUM,
 goal_id: 'goal-1',
 scope: 'goal',
 kind: 'routine',
 completion_rule: {
 type: 'consistency',
 required_done: 5,
 window_days: 7,
 },
 todos: [
 {
 id: 'todo-1',
 title: 'Repeat',
 description: '',
 status: StatusType.OUTSTANDING,
 priority: PriorityType.MEDIUM,
 task_id: 'routine-1',
 repeat_interval: 'daily',
 },
 ],
 subtasks: [],
 },
 ],
 milestones: [
 {
 id: 'milestone-1',
 title: 'Milestone',
 description: '',
 status: StatusType.OUTSTANDING,
 priority: PriorityType.MEDIUM,
 goal_id: 'goal-1',
 tasks: [taskWithSubtask],
 },
 ],
};

describe('buildExportPayload', () => {
 it('includes nested subtasks and deduplicates nested tasks', () => {
 const payload = buildExportPayload([goal], [], [taskWithSubtask], [], []);

 expect(payload.version).toBe(1);
 expect(payload.tasks.filter((task) => task.id === 'task-1')).toHaveLength(1);
 expect(payload.subtasks).toEqual([taskWithSubtask.subtasks[0]]);
 });

 it('includes goal routines, nested todos, and completion rules without flat-store help', () => {
 const payload = buildExportPayload([goal], [], [], [], []);

 expect(payload.tasks.map((task) => task.id)).toContain('routine-1');
 expect(payload.todos.map((todo) => todo.id)).toContain('todo-1');
 expect(payload.goals[0].completion_rule).toEqual({ type: 'structural' });
 expect(payload.tasks.find((task) => task.id === 'routine-1')?.completion_rule).toEqual({
 type: 'consistency',
 required_done: 5,
 window_days: 7,
 });
 });
});
