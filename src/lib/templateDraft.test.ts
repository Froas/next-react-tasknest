import { describe, expect, it } from 'vitest';
import { emptyTemplateDraft, parseTemplateTags, templateDraftToBlueprint } from './templateDraft';

describe('templateDraftToBlueprint', () => {
 it('creates a versioned scratch blueprint with reusable relative structure', () => {
 const blueprint = templateDraftToBlueprint({
 ...emptyTemplateDraft(),
 title: 'Launch system',
 durationDays: 30,
 goalTasks: [{
 title: 'Daily signal',
 description: '',
 kind: 'routine',
 priority: 'medium',
 subtaskTitles: '',
 todoTitles: 'Plan the day, Review the day',
 }],
 milestones: [{
 title: 'First release',
 description: 'Ship something useful',
 dueDateOffsetDays: 14,
 tasks: [{
 title: 'Build MVP',
 description: '',
 kind: 'project',
 priority: 'high',
 subtaskTitles: 'Prototype\nTest\nShip',
 todoTitles: '',
 }],
 }],
 });

 expect(blueprint.schema_version).toBe(3);
 expect(blueprint.source).toEqual({ type: 'scratch' });
 expect(blueprint.duration_days).toBe(30);
 expect(blueprint.goal_tasks?.[0].todos).toHaveLength(2);
 expect(blueprint.goal_tasks?.[0].todos?.[0]).toMatchObject({
 tracking_mode: 'ongoing',
 tracking_state: 'active',
 });
 expect(blueprint.milestones?.[0].tasks?.[0].subtasks).toHaveLength(3);
 });

 it('preserves an evolving challenge while keeping future stages planned', () => {
 const draft = emptyTemplateDraft();
 draft.milestones = [
 {
 title: 'Week 1',
 description: '',
 dueDateOffsetDays: 7,
 tasks: [{
 title: 'Sleep before 01:00',
 description: '',
 kind: 'challenge',
 priority: 'medium',
 subtaskTitles: '',
 todoTitles: 'Sleep before 01:00',
 trackingMode: 'staged',
 routineSeriesKey: 'bedtime',
 stageOrder: 1,
 requiredCompletions: 7,
 windowDays: 7,
 }],
 },
 {
 title: 'Week 2',
 description: '',
 dueDateOffsetDays: 14,
 tasks: [{
 title: 'Sleep before 00:30',
 description: '',
 kind: 'challenge',
 priority: 'medium',
 subtaskTitles: '',
 todoTitles: 'Sleep before 00:30',
 trackingMode: 'staged',
 routineSeriesKey: 'bedtime',
 stageOrder: 2,
 requiredCompletions: 7,
 windowDays: 7,
 }],
 },
 ];

 const blueprint = templateDraftToBlueprint(draft);
 const first = blueprint.milestones?.[0].tasks?.[0];
 const second = blueprint.milestones?.[1].tasks?.[0];

 expect(first?.todos?.[0]).toMatchObject({ tracking_mode: 'staged', tracking_state: 'active', stage_order: 1 });
 expect(second?.status).toBe('outstanding');
 expect(second?.todos?.[0]).toMatchObject({ tracking_mode: 'staged', tracking_state: 'planned', stage_order: 2 });
 });

 it('normalizes and deduplicates tags', () => {
 expect(parseTemplateTags('Work, #Focus\nwork')).toEqual(['work', 'focus']);
 });
});
