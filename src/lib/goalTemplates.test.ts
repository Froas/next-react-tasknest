import { describe, expect, it } from 'vitest';
import {
 GOAL_TEMPLATES,
 countTemplateMetrics,
 countTemplateSubtasks,
 countTemplateTasks,
 countTemplateTodos,
} from './goalTemplates';

describe('starter goal templates', () => {
 it('ships a full starter catalog', () => {
 expect(GOAL_TEMPLATES).toHaveLength(25);
 });

 it('includes exponentially scaled templates for dense-tree testing', () => {
 const scalingTemplates = GOAL_TEMPLATES.filter((template) => template.id.startsWith('test-scale-'));

 expect(scalingTemplates.map((template) => template.blueprint.milestones.length)).toEqual([1, 2, 4, 8, 16]);
 expect(scalingTemplates.map((template) => countTemplateTasks(template))).toEqual([3, 9, 33, 129, 513]);
 });

 it('ship goal-level routines for Today instead of only milestone work', () => {
 for (const template of GOAL_TEMPLATES) {
 const routines = template.blueprint.goal_tasks?.filter((task) => task.kind === 'routine') ?? [];

 expect(routines.length, `${template.id} should include at least one goal routine`).toBeGreaterThan(0);
 expect(
 routines.every((task) => task.scope === 'goal'),
 `${template.id} routines should be goal scoped`,
 ).toBe(true);
 expect(
 routines.some((task) => (task.todos?.length ?? 0) > 0),
 `${template.id} should create recurring definitions for Today`,
 ).toBe(true);
 expect(
 routines.flatMap((task) => task.todos ?? []).every((todo) => todo.tracking_mode === 'ongoing'),
 `${template.id} goal routines should stay active until explicitly paused`,
 ).toBe(true);
 }
 });

 it('keeps todos as recurring definitions and one-off work as subtasks', () => {
 for (const template of GOAL_TEMPLATES) {
 const tasks = [
 ...(template.blueprint.goal_tasks ?? []),
 ...template.blueprint.milestones.flatMap((milestone) => milestone.tasks),
 ];
 const todos = tasks.flatMap((task) => task.todos ?? []);
 const subtasks = tasks.flatMap((task) => task.subtasks ?? []);

 expect(todos.length, `${template.id} should include recurring todos`).toBeGreaterThan(0);
 expect(
 todos.every((todo) => Boolean(todo.repeat_interval || todo.recurrence)),
 `${template.id} todos should have recurrence`,
 ).toBe(true);
 expect(subtasks.length, `${template.id} should include structural subtasks`).toBeGreaterThan(0);
 expect(
 tasks.filter((task) => task.kind === 'challenge').flatMap((task) => task.todos ?? [])
 .every((todo) => todo.tracking_mode === 'bounded' || todo.tracking_mode === 'staged'),
 `${template.id} challenges should carry an explicit tracking contract`,
 ).toBe(true);
 }
 });

 it('counts blueprint entities across goal and milestone scopes', () => {
 for (const template of GOAL_TEMPLATES) {
 expect(countTemplateTasks(template)).toBeGreaterThan(0);
 expect(countTemplateTodos(template)).toBeGreaterThan(0);
 expect(countTemplateSubtasks(template)).toBeGreaterThan(0);
 expect(countTemplateMetrics(template)).toBeGreaterThan(0);
 }
 });
});
