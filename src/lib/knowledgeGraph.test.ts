import { describe, expect, it } from 'vitest';
import { buildKnowledgeGraph, extractWikiLinks, getGoalScopeNodeIds, layoutKnowledgeGraph } from '@/lib/knowledgeGraph';
import { PriorityType, StatusType, type GoalItem } from '@/lib/types';

const goal: GoalItem = {
 id: 'goal-1', title: 'Goal', description: '', status: StatusType.STARTED, priority: PriorityType.MEDIUM,
 milestones: [{
 id: 'milestone-1', title: 'Milestone', description: '', status: StatusType.STARTED, priority: PriorityType.MEDIUM,
 tasks: [{
 id: 'task-1', title: 'Task', description: '', status: StatusType.STARTED, priority: PriorityType.MEDIUM,
 todos: [{ id: 'todo-1', title: 'Routine', description: '', status: StatusType.OUTSTANDING, priority: PriorityType.MEDIUM }],
 subtasks: [{ id: 'subtask-1', task_id: 'task-1', title: 'Step', description: '', status: StatusType.OUTSTANDING, priority: PriorityType.MEDIUM }],
 }],
 }],
};

describe('knowledge graph', () => {
 it('builds hierarchy, note, and tag edges', () => {
 const graph = buildKnowledgeGraph([goal], [{
 id: 'note-1', title: 'Context', body: 'Continue [[Task]] and review [[#learning]].', pinned: false, kind: 'note', goal_id: 'goal-1', tag: 'work',
 created_at: '2026-07-13T00:00:00Z', updated_at: '2026-07-13T00:00:00Z',
 }], []);
 expect(graph.nodes.map((node) => node.id)).toEqual(expect.arrayContaining(['goal:goal-1', 'milestone:milestone-1', 'task:task-1', 'todo:todo-1', 'subtask:subtask-1', 'note:note-1', 'tag:work', 'tag:learning']));
 expect(graph.edges.some((edge) => edge.from === 'goal:goal-1' && edge.to === 'milestone:milestone-1')).toBe(true);
 expect(graph.edges.some((edge) => edge.from === 'note:note-1' && edge.to === 'goal:goal-1')).toBe(true);
 expect(graph.edges.some((edge) => edge.from === 'note:note-1' && edge.to === 'task:task-1' && edge.kind === 'links')).toBe(true);
 expect(graph.edges.some((edge) => edge.from === 'note:note-1' && edge.to === 'tag:learning' && edge.kind === 'tagged')).toBe(true);
 expect(graph.nodes.find((node) => node.id === 'note:note-1')?.timestamp).toBe('2026-07-13T00:00:00Z');
 });

 it('supports typed manual links and skips ambiguous untyped titles', () => {
 const duplicateTitleGoal = { ...goal, id: 'goal-2', title: 'Task', milestones: [] };
 const graph = buildKnowledgeGraph([goal, duplicateTitleGoal], [{
 id: 'note-1', title: 'Context', body: 'Ambiguous [[Task]], explicit [[task: Task]], and goal [[goal: Task]].', pinned: false, kind: 'note',
 created_at: '2026-07-13T00:00:00Z', updated_at: '2026-07-13T00:00:00Z',
 }], []);
 const links = graph.edges.filter((edge) => edge.from === 'note:note-1' && edge.kind === 'links');
 expect(links.map((edge) => edge.to).sort()).toEqual(['goal:goal-2', 'task:task-1']);
 });

 it('extracts wiki links without treating ordinary markdown as graph links', () => {
 expect(extractWikiLinks('See [[Goal Alpha]], [[#health]], and [normal](https://example.com).')).toEqual(['Goal Alpha', '#health']);
 });

 it('lays node types into deterministic columns', () => {
 const graph = buildKnowledgeGraph([goal], [], []);
 const first = layoutKnowledgeGraph(graph.nodes, graph.edges);
 const second = layoutKnowledgeGraph(graph.nodes, graph.edges);
 expect(Array.from(first.positions.values())).toEqual(Array.from(second.positions.values()));
 expect(first.positions.get('goal:goal-1')?.x).toBeLessThan(first.positions.get('task:task-1')?.x ?? 0);
 expect(first.positions.get('goal:goal-1')?.y).toBe(first.positions.get('milestone:milestone-1')?.y);
 });

 it('focuses on selected goal branches and their direct context', () => {
 const secondGoal: GoalItem = {
 ...goal,
 id: 'goal-2',
 title: 'Second goal',
 milestones: [],
 tasks: [],
 };
 const graph = buildKnowledgeGraph([goal, secondGoal], [{
 id: 'note-1', title: 'Context', body: '', pinned: false, kind: 'note', goal_id: 'goal-1', tag: 'shared',
 created_at: '2026-07-13T00:00:00Z', updated_at: '2026-07-13T00:00:00Z',
 }], [{ id: 'tag-1', name: 'shared', goal_id: 'goal-2' }]);

 const scope = getGoalScopeNodeIds(graph, new Set(['goal-1']));
 expect(scope.has('goal:goal-1')).toBe(true);
 expect(scope.has('task:task-1')).toBe(true);
 expect(scope.has('note:note-1')).toBe(true);
 expect(scope.has('tag:shared')).toBe(true);
 expect(scope.has('goal:goal-2')).toBe(false);
 });
});
