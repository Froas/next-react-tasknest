'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Check, Network, Search } from 'lucide-react';
import { withAuth } from '@/hoc/withAuth';
import { AuthRequiredError, notesApi, tagsApi, type NoteItem } from '@/lib/api';
import {
 buildKnowledgeGraph,
 getGoalScopeNodeIds,
 layoutKnowledgeGraph,
 type PositionedKnowledgeNode,
 type KnowledgeNodeType,
} from '@/lib/knowledgeGraph';
import { StatusType, type Tag } from '@/lib/types';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import { useStore } from '@/store/useStore';

const NODE_TYPES: Array<{ id: KnowledgeNodeType; label: string }> = [
 { id: 'goal', label: 'Goals' },
 { id: 'milestone', label: 'Milestones' },
 { id: 'task', label: 'Tasks' },
 { id: 'todo', label: 'Todos' },
 { id: 'subtask', label: 'Subtasks' },
 { id: 'note', label: 'Notes' },
 { id: 'signal', label: 'Signals' },
 { id: 'tag', label: 'Tags' },
];

const FINISHED = new Set([StatusType.FINISHED, StatusType.CLOSED, StatusType.ABORTED, StatusType.CANCELLED]);

const GraphPage: React.FC = () => {
 useDocumentTitle('Knowledge Graph');
 const goals = useStore((state) => state.goals);
 const fetchGoals = useStore((state) => state.fetchGoals);
 const [notes, setNotes] = useState<NoteItem[]>([]);
 const [tags, setTags] = useState<Tag[]>([]);
 const [enabledTypes, setEnabledTypes] = useState<Set<KnowledgeNodeType>>(new Set(NODE_TYPES.map((type) => type.id)));
 const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'finished'>('all');
 const [tagFilter, setTagFilter] = useState('all');
 const [dateRange, setDateRange] = useState<'all' | '7' | '30' | '90'>('all');
 const [selectedGoalIds, setSelectedGoalIds] = useState<Set<string>>(new Set());
 const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
 const [search, setSearch] = useState('');
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);

 useEffect(() => { void fetchGoals(); }, [fetchGoals]);
 useEffect(() => {
 let cancelled = false;
 (async () => {
 try {
 const [noteRows, tagRows] = await Promise.all([notesApi.getAll(), tagsApi.getAll()]);
 if (!cancelled) {
 setNotes(noteRows);
 setTags(tagRows);
 }
 } catch (caught) {
 if (!(caught instanceof AuthRequiredError) && !cancelled) setError(caught instanceof Error ? caught.message : 'Failed to load graph');
 } finally {
 if (!cancelled) setLoading(false);
 }
 })();
 return () => { cancelled = true; };
 }, []);

 const graph = useMemo(() => buildKnowledgeGraph(goals, notes, tags), [goals, notes, tags]);
 const sortedGoals = useMemo(() => [...goals].sort((a, b) => a.title.localeCompare(b.title)), [goals]);
 const tagNames = useMemo(() => graph.nodes.filter((node) => node.type === 'tag').map((node) => node.label).sort(), [graph.nodes]);
 const goalScope = useMemo(
 () => selectedGoalIds.size > 0 ? getGoalScopeNodeIds(graph, selectedGoalIds) : null,
 [graph, selectedGoalIds],
 );
 const filteredNodes = useMemo(() => {
 const query = search.trim().toLowerCase();
 const cutoff = dateRange === 'all' ? null : Date.now() - Number(dateRange) * 24 * 60 * 60 * 1000;
 let tagConnected: Set<string> | null = null;
 if (tagFilter !== 'all') {
 const tagId = `tag:${tagFilter.toLowerCase()}`;
 tagConnected = new Set([tagId]);
 graph.edges.filter((edge) => edge.kind === 'tagged' && (edge.from === tagId || edge.to === tagId)).forEach((edge) => {
 tagConnected?.add(edge.from);
 tagConnected?.add(edge.to);
 });
 }
 return graph.nodes.filter((node) => {
 if (goalScope && !goalScope.has(node.id)) return false;
 if (!enabledTypes.has(node.type)) return false;
 if (query && !node.label.toLowerCase().includes(query)) return false;
 if (tagConnected && !tagConnected.has(node.id)) return false;
 if (cutoff && node.timestamp && new Date(node.timestamp).getTime() < cutoff) return false;
 if (statusFilter !== 'all' && node.status) {
 const isFinished = FINISHED.has(node.status);
 if (statusFilter === 'finished' ? !isFinished : isFinished) return false;
 }
 return true;
 });
 }, [dateRange, enabledTypes, goalScope, graph.edges, graph.nodes, search, statusFilter, tagFilter]);
 const visibleIds = useMemo(() => new Set(filteredNodes.map((node) => node.id)), [filteredNodes]);
 const visibleEdges = useMemo(
 () => graph.edges.filter((edge) => visibleIds.has(edge.from) && visibleIds.has(edge.to)),
 [graph.edges, visibleIds],
 );
 const layout = useMemo(() => layoutKnowledgeGraph(filteredNodes, visibleEdges), [filteredNodes, visibleEdges]);
 const emphasizedNodeIds = useMemo(() => {
 if (!hoveredNodeId) return null;
 const connected = new Set([hoveredNodeId]);
 visibleEdges.forEach((edge) => {
 if (edge.from === hoveredNodeId) connected.add(edge.to);
 if (edge.to === hoveredNodeId) connected.add(edge.from);
 });
 return connected;
 }, [hoveredNodeId, visibleEdges]);

 const toggleType = (type: KnowledgeNodeType) => {
 setEnabledTypes((current) => {
 const next = new Set(current);
 if (next.has(type)) next.delete(type);
 else next.add(type);
 return next;
 });
 };

 const toggleGoal = (goalId: string) => {
 setSelectedGoalIds((current) => {
 if (current.size === 0) return new Set([goalId]);
 const next = new Set(current);
 if (next.has(goalId)) next.delete(goalId);
 else next.add(goalId);
 return next;
 });
 };

 return (
 <div className="page">
 <div className="page-head">
 <div className="page-eyebrow">Connected context</div>
 <h1 className="page-title">Knowledge Graph</h1>
 <p className="page-lede">A read-only map of goals, work, routines, notes, signals, and tags.</p>
 </div>

 {error && <div className="mb-4 rounded-xl border p-3 text-sm" style={{ borderColor: 'var(--tn-bad)', color: 'var(--tn-bad)' }}>{error}</div>}

 {sortedGoals.length > 0 && (
 <section className="mb-4 rounded-2xl border p-3" style={{ border: 'var(--tn-line)', background: 'var(--tn-card)' }} aria-labelledby="goal-focus-title">
 <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
 <div>
 <h2 id="goal-focus-title" className="text-sm font-semibold">Goal focus</h2>
 <p className="text-xs text-muted-foreground">Pick one goal, then add others to compare their branches.</p>
 </div>
 <span className="text-xs text-muted-foreground">
 {selectedGoalIds.size === 0 ? `All ${sortedGoals.length} goals` : `${selectedGoalIds.size} of ${sortedGoals.length} goals`}
 </span>
 </div>
 <div className="flex flex-wrap gap-2" role="group" aria-label="Goals shown in the graph">
 <button
 type="button"
 aria-pressed={selectedGoalIds.size === 0}
 onClick={() => setSelectedGoalIds(new Set())}
 className={selectedGoalIds.size === 0 ? 'btn btn-primary !px-3 !py-2 text-xs' : 'btn btn-secondary !px-3 !py-2 text-xs'}
 >
 All goals
 </button>
 {sortedGoals.map((goal) => {
 const selected = selectedGoalIds.has(goal.id);
 return (
 <button
 key={goal.id}
 type="button"
 aria-pressed={selected}
 onClick={() => toggleGoal(goal.id)}
 className={selected ? 'btn btn-primary !px-3 !py-2 text-xs' : 'btn btn-secondary !px-3 !py-2 text-xs'}
 >
 {selected && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
 {goal.title}
 </button>
 );
 })}
 </div>
 </section>
 )}

 <div className="filter-toolbar mb-4 !static">
 <Search className="h-4 w-4 text-muted-foreground" />
 <input className="filter-input" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a node…" />
 <select className="filter-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
 <option value="all">All statuses</option>
 <option value="active">Active only</option>
 <option value="finished">Finished only</option>
 </select>
 <select className="filter-select" value={tagFilter} onChange={(event) => setTagFilter(event.target.value)}>
 <option value="all">All tags</option>
 {tagNames.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
 </select>
 <select className="filter-select" value={dateRange} onChange={(event) => setDateRange(event.target.value as typeof dateRange)}>
 <option value="all">All dates</option>
 <option value="7">Last 7 days</option>
 <option value="30">Last 30 days</option>
 <option value="90">Last 90 days</option>
 </select>
 </div>

 <div className="mb-4 flex flex-wrap gap-2">
 {NODE_TYPES.map((type) => (
 <button
 key={type.id}
 type="button"
 aria-pressed={enabledTypes.has(type.id)}
 onClick={() => toggleType(type.id)}
 className={enabledTypes.has(type.id) ? 'btn btn-primary !px-3 !py-2 text-xs' : 'btn btn-secondary !px-3 !py-2 text-xs opacity-60'}
 >
 {type.label}
 </button>
 ))}
 </div>

 <div className="mb-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
 <span>{filteredNodes.length} nodes</span>
 <span>{visibleEdges.length} edges</span>
 <span>Use [[Title]], [[goal: Title]], or [[#tag]] in Notes to add manual edges</span>
 <span>Click a node to open its source</span>
 </div>

 {loading ? (
 <div className="card text-sm text-muted-foreground">Loading graph…</div>
 ) : filteredNodes.length === 0 ? (
 <div className="card text-center">
 <Network className="mx-auto mb-3 h-8 w-8" style={{ color: 'var(--tn-accent)' }} />
 <h2 className="font-semibold">No matching nodes</h2>
 <p className="text-sm text-muted-foreground">Change filters or add connected data.</p>
 </div>
 ) : (
 <div className="overflow-auto rounded-2xl border" style={{ border: 'var(--tn-line)', background: 'var(--tn-card)', maxHeight: '72vh' }}>
 <svg width={layout.width} height={layout.height} role="img" aria-label="Knowledge graph">
 <title>Knowledge graph with {filteredNodes.length} nodes and {visibleEdges.length} connections</title>
 <rect width={layout.width} height={layout.height} fill="var(--tn-card)" />
 {visibleEdges.map((edge) => {
 const from = layout.positions.get(edge.from);
 const to = layout.positions.get(edge.to);
 if (!from || !to) return null;
 const emphasized = !hoveredNodeId || edge.from === hoveredNodeId || edge.to === hoveredNodeId;
 return (
 <path
 key={edge.id}
 d={edgePath(from, to, layout.nodeWidth)}
 fill="none"
 stroke={edge.kind === 'contains' ? 'var(--tn-fg-muted)' : 'var(--tn-accent)'}
 strokeOpacity={emphasized ? (hoveredNodeId ? 0.72 : edge.kind === 'contains' ? 0.24 : 0.42) : 0.06}
 strokeWidth={emphasized && hoveredNodeId ? 2.2 : edge.kind === 'contains' ? 1.35 : 1.7}
 strokeDasharray={edge.kind === 'tagged' ? '4 5' : undefined}
 style={{ transition: 'stroke-opacity 160ms ease, stroke-width 160ms ease' }}
 />
 );
 })}
 {Array.from(layout.positions.values()).map((node) => (
 <a
 key={node.id}
 href={node.href}
 aria-label={`Open ${node.type}: ${node.label}`}
 onMouseEnter={() => setHoveredNodeId(node.id)}
 onMouseLeave={() => setHoveredNodeId(null)}
 onFocus={() => setHoveredNodeId(node.id)}
 onBlur={() => setHoveredNodeId(null)}
 >
 <g
 className="cursor-pointer"
 opacity={emphasizedNodeIds && !emphasizedNodeIds.has(node.id) ? 0.3 : 1}
 style={{ transition: 'opacity 160ms ease' }}
 >
 <title>{node.type}: {node.label}</title>
 <rect
 x={node.x - layout.nodeWidth / 2}
 y={node.y - layout.nodeHeight / 2}
 width={layout.nodeWidth}
 height={layout.nodeHeight}
 rx={14}
 fill={nodeFill(node.type)}
 stroke={nodeStroke(node.type)}
 strokeWidth={hoveredNodeId === node.id ? 2 : 1.2}
 />
 <rect
 x={node.x - layout.nodeWidth / 2}
 y={node.y - layout.nodeHeight / 2 + 9}
 width={4}
 height={layout.nodeHeight - 18}
 rx={2}
 fill={nodeAccent(node.type)}
 />
 <text x={node.x - layout.nodeWidth / 2 + 17} y={node.y - 6} fill="var(--tn-fg)" fontSize={12} fontWeight={600}>
 {truncate(node.label, 27)}
 </text>
 <text x={node.x - layout.nodeWidth / 2 + 17} y={node.y + 13} fill="var(--tn-fg-muted)" fontSize={9.5}>
 {node.type}{node.status ? ` · ${node.status}` : ''}
 </text>
 </g>
 </a>
 ))}
 </svg>
 </div>
 )}
 </div>
 );
};

const truncate = (value: string, max: number) => value.length > max ? `${value.slice(0, max - 1)}…` : value;

const nodeFill = (type: KnowledgeNodeType) => {
 if (type === 'goal') return 'color-mix(in srgb, var(--tn-accent) 18%, var(--tn-card))';
 if (type === 'signal') return 'color-mix(in srgb, var(--tn-warn, #d69c2f) 18%, var(--tn-card))';
 if (type === 'note') return 'color-mix(in srgb, var(--tn-good) 12%, var(--tn-card))';
 if (type === 'tag') return 'var(--tn-hover)';
 return 'var(--tn-active)';
};

const nodeStroke = (type: KnowledgeNodeType) => type === 'goal' || type === 'signal' ? 'var(--tn-accent)' : 'var(--tn-line-strong, var(--tn-fg-muted))';

const nodeAccent = (type: KnowledgeNodeType) => {
 if (type === 'goal') return 'var(--tn-accent)';
 if (type === 'signal') return 'var(--tn-warn, var(--tn-accent))';
 if (type === 'note') return 'var(--tn-good)';
 if (type === 'tag') return 'var(--tn-fg-muted)';
 return 'var(--tn-line-strong, var(--tn-fg-muted))';
};

const edgePath = (from: PositionedKnowledgeNode, to: PositionedKnowledgeNode, nodeWidth: number) => {
 const left = from.x <= to.x ? from : to;
 const right = from.x <= to.x ? to : from;
 const startX = left.x + nodeWidth / 2;
 const endX = right.x - nodeWidth / 2;
 const controlX = startX + (endX - startX) / 2;
 return `M ${startX} ${left.y} C ${controlX} ${left.y}, ${controlX} ${right.y}, ${endX} ${right.y}`;
};

export default withAuth(GraphPage);
