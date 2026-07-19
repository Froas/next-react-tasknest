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

 expect(blueprint.schema_version).toBe(1);
 expect(blueprint.source).toEqual({ type: 'scratch' });
 expect(blueprint.duration_days).toBe(30);
 expect(blueprint.goal_tasks?.[0].todos).toHaveLength(2);
 expect(blueprint.milestones?.[0].tasks?.[0].subtasks).toHaveLength(3);
 });

 it('normalizes and deduplicates tags', () => {
 expect(parseTemplateTags('Work, #Focus\nwork')).toEqual(['work', 'focus']);
 });
});
