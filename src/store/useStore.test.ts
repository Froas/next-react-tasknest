import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from './useStore';
import { StatusType, PriorityType, GoalItem, MilestoneItem, TaskItem, TodoItem } from '@/lib/types';

const goal = (id: string, milestones: MilestoneItem[] = []): GoalItem => ({
 id,
 title: `Goal ${id}`,
 description: '',
 status: StatusType.IN_PROGRESS,
 priority: PriorityType.MEDIUM,
 milestones,
});

const milestone = (id: string, goalId: string, tasks: TaskItem[] = []): MilestoneItem => ({
 id,
 title: `Milestone ${id}`,
 description: '',
 status: StatusType.IN_PROGRESS,
 priority: PriorityType.MEDIUM,
 goal_id: goalId,
 tasks,
});

const task = (id: string, milestoneId: string, todos: TodoItem[] = []): TaskItem => ({
 id,
 title: `Task ${id}`,
 description: '',
 status: StatusType.OUTSTANDING,
 priority: PriorityType.MEDIUM,
 milestone_id: milestoneId,
 subtasks: [],
 todos,
});

const todo = (id: string, taskId: string): TodoItem => ({
 id,
 title: `Todo ${id}`,
 description: '',
 status: StatusType.OUTSTANDING,
 priority: PriorityType.MEDIUM,
 task_id: taskId,
});

describe('useStore — nested updates', () => {
 beforeEach(() => {
 useStore.setState({
 goals: [],
 milestones: [],
 tasks: [],
 todos: [],
 events: [],
 goalsFetchedAt: null,
 milestonesFetchedAt: null,
 tasksFetchedAt: null,
 todosFetchedAt: null,
 eventsFetchedAt: null,
 });
 });

 it('addGoal normalises milestones to empty array', () => {
 useStore.getState().addGoal({ ...goal('g1'), milestones: undefined as any });
 expect(useStore.getState().goals[0].milestones).toEqual([]);
 });

 it('updateTaskInGoals updates nested task across the tree', () => {
 const t = task('t1', 'm1');
 useStore.getState().setGoals([goal('g1', [milestone('m1', 'g1', [t])])]);
 useStore.getState().updateTaskInGoals({ ...t, status: StatusType.FINISHED });
 const updated = useStore.getState().goals[0].milestones[0].tasks[0];
 expect(updated.status).toBe(StatusType.FINISHED);
 });

 it('updateTodoInGoals updates a nested todo', () => {
 const td = todo('td1', 't1');
 const t = task('t1', 'm1', [td]);
 useStore.getState().setGoals([goal('g1', [milestone('m1', 'g1', [t])])]);
 useStore.getState().updateTodoInGoals({ ...td, status: StatusType.FINISHED });
 const updated = useStore.getState().goals[0].milestones[0].tasks[0].todos[0];
 expect(updated.status).toBe(StatusType.FINISHED);
 });

 it('deleteTaskFromGoals removes from tree and flat list', () => {
 const t = task('t1', 'm1');
 useStore.setState({
 goals: [goal('g1', [milestone('m1', 'g1', [t])])],
 tasks: [t],
 });
 useStore.getState().deleteTaskFromGoals('t1');
 expect(useStore.getState().goals[0].milestones[0].tasks).toHaveLength(0);
 expect(useStore.getState().tasks).toHaveLength(0);
 });

 it('moveTaskToMilestone relocates a task between milestones', () => {
 const t = task('t1', 'm1');
 useStore.getState().setGoals([
 goal('g1', [milestone('m1', 'g1', [t]), milestone('m2', 'g1')]),
 ]);
 useStore.getState().moveTaskToMilestone('t1', 'm2');
 const milestones = useStore.getState().goals[0].milestones;
 expect(milestones.find((m) => m.id === 'm1')!.tasks).toHaveLength(0);
 expect(milestones.find((m) => m.id === 'm2')!.tasks[0].id).toBe('t1');
 expect(milestones.find((m) => m.id === 'm2')!.tasks[0].milestone_id).toBe('m2');
 });

 it('reorderMilestonesInGoal reorders within a goal', () => {
 useStore.getState().setGoals([
 goal('g1', [milestone('m1', 'g1'), milestone('m2', 'g1'), milestone('m3', 'g1')]),
 ]);
 useStore.getState().reorderMilestonesInGoal('g1', ['m3', 'm1', 'm2']);
 const ids = useStore.getState().goals[0].milestones.map((m) => m.id);
 expect(ids).toEqual(['m3', 'm1', 'm2']);
 });

 it('addEvents appends multiple events in one update', () => {
 useStore.getState().addEvents([
 { id: 'e1', title: 'a', status: StatusType.OUTSTANDING, created_at: '', updated_at: '' },
 { id: 'e2', title: 'b', status: StatusType.OUTSTANDING, created_at: '', updated_at: '' },
 ]);
 expect(useStore.getState().events).toHaveLength(2);
 });
});
