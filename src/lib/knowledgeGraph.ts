import type { NoteItem } from '@/lib/api';
import type { GoalItem, StatusType, Tag } from '@/lib/types';

export type KnowledgeNodeType = 'goal' | 'milestone' | 'task' | 'todo' | 'subtask' | 'note' | 'signal' | 'tag';

export type KnowledgeNode = {
 id: string;
 entityId: string;
 type: KnowledgeNodeType;
 label: string;
 href: string;
 status?: StatusType;
 tags: string[];
 depth: number;
 parentId?: string;
 timestamp?: string;
};

export type KnowledgeEdge = {
 id: string;
 from: string;
 to: string;
 kind: 'contains' | 'links' | 'tagged';
};

export type KnowledgeGraph = { nodes: KnowledgeNode[]; edges: KnowledgeEdge[] };

const tagNodeId = (name: string) => `tag:${name.trim().toLowerCase()}`;
const normalizeLabel = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase();
const WIKI_LINK_PATTERN = /\[\[([^\[\]]+)\]\]/g;

export const extractWikiLinks = (body?: string | null): string[] => {
 if (!body) return [];
 return Array.from(body.matchAll(WIKI_LINK_PATTERN))
 .map((match) => match[1].trim())
 .filter(Boolean);
};

const parseWikiLink = (value: string): { type?: KnowledgeNodeType; label: string; tag?: string } => {
 const clean = value.trim();
 if (clean.startsWith('#')) return { label: clean.slice(1).trim(), tag: clean.slice(1).trim() };
 const separator = clean.indexOf(':');
 if (separator > 0) {
 const prefix = normalizeLabel(clean.slice(0, separator));
 const label = clean.slice(separator + 1).trim();
 const aliases: Record<string, KnowledgeNodeType> = {
 goal: 'goal', milestone: 'milestone', task: 'task', todo: 'todo', routine: 'todo',
 subtask: 'subtask', note: 'note', signal: 'signal', tag: 'tag',
 };
 if (aliases[prefix]) return { type: aliases[prefix], label, tag: aliases[prefix] === 'tag' ? label : undefined };
 }
 return { label: clean };
};

export const buildKnowledgeGraph = (
 goals: GoalItem[],
 notes: NoteItem[],
 tags: Tag[],
): KnowledgeGraph => {
 const nodes = new Map<string, KnowledgeNode>();
 const edges = new Map<string, KnowledgeEdge>();
 const addNode = (node: KnowledgeNode) => nodes.set(node.id, node);
 const addEdge = (from: string, to: string, kind: KnowledgeEdge['kind']) => {
 if (!nodes.has(from) || !nodes.has(to)) return;
 const id = `${kind}:${from}:${to}`;
 edges.set(id, { id, from, to, kind });
 };
 const ensureTag = (name: string) => {
 const clean = name.trim();
 if (!clean) return null;
 const id = tagNodeId(clean);
 if (!nodes.has(id)) addNode({ id, entityId: clean, type: 'tag', label: clean, href: `/tags?tag=${encodeURIComponent(clean)}`, tags: [clean], depth: 5 });
 return id;
 };

 goals.forEach((goal) => {
 const goalId = `goal:${goal.id}`;
 addNode({ id: goalId, entityId: goal.id, type: 'goal', label: goal.title, href: `/goal/${goal.id}`, status: goal.status, tags: [], depth: 0, timestamp: goal.start_datetime });

 (goal.tasks ?? []).forEach((task) => {
 const taskId = `task:${task.id}`;
 addNode({ id: taskId, entityId: task.id, type: 'task', label: task.title, href: `/task/${task.id}`, status: task.status, tags: [], depth: 2, parentId: goalId, timestamp: task.start_datetime ?? task.scheduled_date ?? task.due_date });
 addEdge(goalId, taskId, 'contains');
 addTaskChildren(taskId, task, addNode, addEdge);
 });

 goal.milestones.forEach((milestone) => {
 const milestoneId = `milestone:${milestone.id}`;
 addNode({ id: milestoneId, entityId: milestone.id, type: 'milestone', label: milestone.title, href: `/milestone/${milestone.id}`, status: milestone.status, tags: [], depth: 1, parentId: goalId, timestamp: milestone.start_datetime ?? milestone.due_date });
 addEdge(goalId, milestoneId, 'contains');
 milestone.tasks.forEach((task) => {
 const taskId = `task:${task.id}`;
 addNode({ id: taskId, entityId: task.id, type: 'task', label: task.title, href: `/task/${task.id}`, status: task.status, tags: [], depth: 2, parentId: milestoneId, timestamp: task.start_datetime ?? task.scheduled_date ?? task.due_date });
 addEdge(milestoneId, taskId, 'contains');
 addTaskChildren(taskId, task, addNode, addEdge);
 });
 });
 });

 notes.forEach((note) => {
 const noteId = `${note.kind === 'signal' ? 'signal' : 'note'}:${note.id}`;
 addNode({
 id: noteId,
 entityId: note.id,
 type: note.kind === 'signal' ? 'signal' : 'note',
 label: note.title,
 href: note.kind === 'signal' ? `/radar?signal=${note.id}` : `/notes?noteId=${note.id}`,
 tags: note.tag ? [note.tag] : [],
 depth: 4,
 timestamp: note.updated_at ?? note.created_at,
 });
 });

 const labelIndex = new Map<string, string[]>();
 nodes.forEach((node) => {
 const key = normalizeLabel(node.label);
 labelIndex.set(key, [...(labelIndex.get(key) ?? []), node.id]);
 });

 notes.forEach((note) => {
 const noteId = `${note.kind === 'signal' ? 'signal' : 'note'}:${note.id}`;
 if (note.task_id) addEdge(noteId, `task:${note.task_id}`, 'links');
 else if (note.goal_id) addEdge(noteId, `goal:${note.goal_id}`, 'links');
 if (note.tag) {
 const id = ensureTag(note.tag);
 if (id) addEdge(noteId, id, 'tagged');
 }
 extractWikiLinks(note.body).forEach((rawLink) => {
 const link = parseWikiLink(rawLink);
 if (link.tag) {
 const id = ensureTag(link.tag);
 if (id) addEdge(noteId, id, 'tagged');
 return;
 }
 const candidates = (labelIndex.get(normalizeLabel(link.label)) ?? [])
 .filter((candidate) => candidate !== noteId)
 .filter((candidate) => !link.type || nodes.get(candidate)?.type === link.type);
 if (candidates.length === 1) addEdge(noteId, candidates[0], 'links');
 });
 });

 tags.forEach((tag) => {
 const id = ensureTag(tag.name);
 if (!id) return;
 const targets = [
 tag.goal_id ? `goal:${tag.goal_id}` : null,
 tag.milestone_id ? `milestone:${tag.milestone_id}` : null,
 tag.task_id ? `task:${tag.task_id}` : null,
 tag.todo_id ? `todo:${tag.todo_id}` : null,
 tag.subtask_id ? `subtask:${tag.subtask_id}` : null,
 ].filter((target): target is string => Boolean(target));
 targets.forEach((target) => addEdge(target, id, 'tagged'));
 });

 return { nodes: Array.from(nodes.values()), edges: Array.from(edges.values()) };
};

const addTaskChildren = (
 taskId: string,
 task: GoalItem['milestones'][number]['tasks'][number],
 addNode: (node: KnowledgeNode) => void,
 addEdge: (from: string, to: string, kind: KnowledgeEdge['kind']) => void,
) => {
 task.todos.forEach((todo) => {
 const id = `todo:${todo.id}`;
 addNode({ id, entityId: todo.id, type: 'todo', label: todo.title, href: '/todo', status: todo.status, tags: [], depth: 3, parentId: taskId, timestamp: todo.start_datetime ?? todo.due_date });
 addEdge(taskId, id, 'contains');
 });
 task.subtasks.forEach((subtask) => {
 const id = `subtask:${subtask.id}`;
 addNode({ id, entityId: subtask.id, type: 'subtask', label: subtask.title, href: `/task/${task.id}`, status: subtask.status, tags: [], depth: 3, parentId: taskId, timestamp: subtask.updated_at ?? subtask.created_at ?? subtask.start_datetime ?? subtask.due_date });
 addEdge(taskId, id, 'contains');
 });
};

export type PositionedKnowledgeNode = KnowledgeNode & { x: number; y: number };

export const layoutKnowledgeGraph = (nodes: KnowledgeNode[]) => {
 const grouped = new Map<number, KnowledgeNode[]>();
 nodes.forEach((node) => grouped.set(node.depth, [...(grouped.get(node.depth) ?? []), node]));
 const positions = new Map<string, PositionedKnowledgeNode>();
 grouped.forEach((rows, depth) => {
 rows.sort((a, b) => a.label.localeCompare(b.label)).forEach((node, index) => {
 positions.set(node.id, { ...node, x: 110 + depth * 235, y: 65 + index * 68 });
 });
 });
 const maxRows = Math.max(1, ...Array.from(grouped.values()).map((rows) => rows.length));
 return { positions, width: 1400, height: Math.max(620, 110 + maxRows * 68) };
};
