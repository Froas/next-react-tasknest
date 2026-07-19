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

/**
 * Returns a focused slice of the graph for one or more goals. The slice keeps
 * the goal hierarchy plus notes, signals, and tags directly connected to it,
 * without pulling in another goal through a shared tag.
 */
export const getGoalScopeNodeIds = (
 graph: KnowledgeGraph,
 goalEntityIds: ReadonlySet<string>,
): Set<string> => {
 const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
 const scoped = new Set(
 Array.from(goalEntityIds, (id) => `goal:${id}`).filter((id) => nodeById.has(id)),
 );

 const children = new Map<string, string[]>();
 graph.edges.forEach((edge) => {
 if (edge.kind !== 'contains') return;
 children.set(edge.from, [...(children.get(edge.from) ?? []), edge.to]);
 });
 const queue = Array.from(scoped);
 while (queue.length > 0) {
 const parent = queue.shift();
 if (!parent) continue;
 (children.get(parent) ?? []).forEach((child) => {
 if (scoped.has(child)) return;
 scoped.add(child);
 queue.push(child);
 });
 }

 const connectedContext = new Set<string>();
 graph.edges.forEach((edge) => {
 if (edge.kind !== 'links') return;
 const from = nodeById.get(edge.from);
 const to = nodeById.get(edge.to);
 if (scoped.has(edge.from) && (to?.type === 'note' || to?.type === 'signal')) connectedContext.add(edge.to);
 if (scoped.has(edge.to) && (from?.type === 'note' || from?.type === 'signal')) connectedContext.add(edge.from);
 });
 connectedContext.forEach((id) => scoped.add(id));

 graph.edges.forEach((edge) => {
 if (edge.kind !== 'tagged') return;
 const from = nodeById.get(edge.from);
 const to = nodeById.get(edge.to);
 if (scoped.has(edge.from) && to?.type === 'tag') scoped.add(edge.to);
 if (scoped.has(edge.to) && from?.type === 'tag') scoped.add(edge.from);
 });

 return scoped;
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

const NODE_WIDTH = 208;
const NODE_HEIGHT = 54;
const COLUMN_GAP = 248;
const ROW_GAP = 72;
const BRANCH_GAP = 28;
const PADDING_X = 120;
const PADDING_Y = 54;
const CONTEXT_TYPES = new Set<KnowledgeNodeType>(['note', 'signal', 'tag']);

export const layoutKnowledgeGraph = (nodes: KnowledgeNode[], edges: KnowledgeEdge[] = []) => {
 const nodeById = new Map(nodes.map((node) => [node.id, node]));
 const positions = new Map<string, PositionedKnowledgeNode>();
 const children = new Map<string, KnowledgeNode[]>();
 nodes.forEach((node) => {
 if (!node.parentId || !nodeById.has(node.parentId) || CONTEXT_TYPES.has(node.type)) return;
 children.set(node.parentId, [...(children.get(node.parentId) ?? []), node]);
 });
 children.forEach((rows) => rows.sort(compareNodes));

 const hierarchyNodes = nodes.filter((node) => !CONTEXT_TYPES.has(node.type));
 const roots = hierarchyNodes
 .filter((node) => !node.parentId || !nodeById.has(node.parentId))
 .sort(compareNodes);
 let nextY = PADDING_Y;
 const visiting = new Set<string>();

 const placeBranch = (node: KnowledgeNode): number => {
 if (positions.has(node.id)) return positions.get(node.id)?.y ?? nextY;
 if (visiting.has(node.id)) {
 const y = nextY;
 nextY += ROW_GAP;
 positions.set(node.id, { ...node, x: PADDING_X + node.depth * COLUMN_GAP, y });
 return y;
 }
 visiting.add(node.id);
 const childRows = children.get(node.id) ?? [];
 const childYs = childRows.map(placeBranch);
 const y = childYs.length > 0
 ? (childYs[0] + childYs[childYs.length - 1]) / 2
 : nextY;
 if (childYs.length === 0) nextY += ROW_GAP;
 positions.set(node.id, { ...node, x: PADDING_X + node.depth * COLUMN_GAP, y });
 visiting.delete(node.id);
 return y;
 };

 roots.forEach((root, index) => {
 placeBranch(root);
 if (root.type === 'goal' && index < roots.length - 1) nextY += BRANCH_GAP;
 });
 hierarchyNodes.filter((node) => !positions.has(node.id)).sort(compareNodes).forEach(placeBranch);

 const edgeNeighbors = new Map<string, string[]>();
 edges.forEach((edge) => {
 if (!nodeById.has(edge.from) || !nodeById.has(edge.to)) return;
 edgeNeighbors.set(edge.from, [...(edgeNeighbors.get(edge.from) ?? []), edge.to]);
 edgeNeighbors.set(edge.to, [...(edgeNeighbors.get(edge.to) ?? []), edge.from]);
 });

 const contextByDepth = new Map<number, KnowledgeNode[]>();
 nodes.filter((node) => CONTEXT_TYPES.has(node.type)).forEach((node) => {
 contextByDepth.set(node.depth, [...(contextByDepth.get(node.depth) ?? []), node]);
 });
 Array.from(contextByDepth.entries()).sort(([a], [b]) => a - b).forEach(([depth, rows]) => {
 const anchored = rows.map((node) => {
 const neighborYs = (edgeNeighbors.get(node.id) ?? [])
 .map((id) => positions.get(id)?.y)
 .filter((value): value is number => typeof value === 'number');
 return {
 node,
 anchor: neighborYs.length > 0 ? neighborYs.reduce((sum, value) => sum + value, 0) / neighborYs.length : Number.POSITIVE_INFINITY,
 };
 }).sort((a, b) => a.anchor - b.anchor || compareNodes(a.node, b.node));
 let columnY = PADDING_Y - ROW_GAP;
 anchored.forEach(({ node, anchor }) => {
 const desiredY = Number.isFinite(anchor) ? anchor : columnY + ROW_GAP;
 const y = Math.max(desiredY, columnY + ROW_GAP);
 positions.set(node.id, { ...node, x: PADDING_X + depth * COLUMN_GAP, y });
 columnY = y;
 });
 });

 const maxDepth = Math.max(0, ...nodes.map((node) => node.depth));
 const maxY = Math.max(PADDING_Y, ...Array.from(positions.values()).map((node) => node.y));
 return {
 positions,
 nodeWidth: NODE_WIDTH,
 nodeHeight: NODE_HEIGHT,
 width: Math.max(680, PADDING_X * 2 + maxDepth * COLUMN_GAP + NODE_WIDTH),
 height: Math.max(420, maxY + NODE_HEIGHT / 2 + PADDING_Y),
 };
};

const compareNodes = (a: KnowledgeNode, b: KnowledgeNode) =>
 a.depth - b.depth || a.label.localeCompare(b.label) || a.id.localeCompare(b.id);
