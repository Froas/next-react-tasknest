import { describe, expect, it } from 'vitest';
import { buildGoalCardView } from './goalCardView';
import { GoalItem, PriorityType, StatusType } from '@/lib/types';

const baseGoal = (overrides: Partial<GoalItem> = {}): GoalItem => ({
 id: 'goal-1',
 title: 'Weight loss',
 description: '',
 priority: PriorityType.HIGH,
 status: StatusType.IN_PROGRESS,
 milestones: [],
 ...overrides,
});

describe('buildGoalCardView', () => {
 it('shows metric movement with the configured unit', () => {
 const goal = baseGoal({
 completion_rule: {
 type: 'metric_target',
 metric_definition_id: 'metric-1',
 metric_name: 'Weight',
 start_value: 110,
 current_value: 92,
 target_value: 80,
 direction: 'decrease',
 },
 });
 const view = buildGoalCardView(goal, [{
 id: 'metric-1', name: 'Weight', unit: 'kg', input_type: 'number', show_on_today: true,
 goal_id: goal.id, position: 1, created_at: '', updated_at: '',
 }]);

 expect(view.progress.headline).toBe('Weight: 92 kg → 80 kg');
 expect(view.progress.detail).toBe('Started at 110 kg');
 expect(view.progress.value).toBe(60);
 expect(view.statusLabel).toBe('Active');
 });

 it('uses the first open milestone task as the next step', () => {
 const goal = baseGoal({ milestones: [{
 id: 'milestone-1', goal_id: 'goal-1', title: 'Reach 100 kg', description: '',
 status: StatusType.IN_PROGRESS, priority: PriorityType.HIGH, position: 1,
 tasks: [{
 id: 'task-1', title: 'Prepare meals', description: '', status: StatusType.OUTSTANDING,
 priority: PriorityType.HIGH, kind: 'project', position: 1, todos: [], subtasks: [],
 }],
 }] });

 expect(buildGoalCardView(goal).nextStep).toEqual({
 title: 'Prepare meals',
 context: 'Reach 100 kg',
 });
 });

 it('guides an empty goal into the builder', () => {
 expect(buildGoalCardView(baseGoal({ status: StatusType.OUTSTANDING })).nextStep.title).toBe('Build your plan');
 });

 it('marks an overdue active goal as needing attention', () => {
 const view = buildGoalCardView(
 baseGoal({ end_datetime: '2026-07-10T00:00:00Z' }),
 [],
 new Date('2026-07-18T12:00:00Z'),
 );
 expect(view.statusLabel).toBe('Needs attention');
 expect(view.dueLabel).toBe('8d overdue');
 });

 it('shows all three hybrid lanes and weighted progress', () => {
 const goal = baseGoal({
 completion_rule: {
 type: 'hybrid',
 structural_weight: 20,
 outcome_weight: 40,
 consistency_weight: 40,
 current_progress: 67,
 outcome: { type: 'metric_target', current_value: 5, target_value: 10, direction: 'at_least' },
 consistency: { type: 'consistency', current_done: 3, required_done: 4, window_days: 7 },
 },
 });
 const view = buildGoalCardView(goal);
 expect(view.progress.value).toBe(67);
 expect(view.progress.lanes?.map((lane) => lane.label)).toEqual(['Plan', 'Outcome', 'Routine']);
 });
});
