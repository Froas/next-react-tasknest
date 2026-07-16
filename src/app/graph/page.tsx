'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Network, Search } from 'lucide-react';
import { withAuth } from '@/hoc/withAuth';
import { AuthRequiredError, notesApi, tagsApi, type NoteItem } from '@/lib/api';
import {
 buildKnowledgeGraph,
 layoutKnowledgeGraph,
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
 const tagNames = useMemo(() => graph.nodes.filter((node) => node.type === 'tag').map((node) => node.label).sort(), [graph.nodes]);
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
 }, [dateRange, enabledTypes, graph.edges, graph.nodes, search, statusFilter, tagFilter]);
 const layout = useMemo(() => layoutKnowledgeGraph(filteredNodes), [filteredNodes]);
 const visibleIds = useMemo(() => new Set(filteredNodes.map((node) => node.id)), [filteredNodes]);
 const visibleEdges = graph.edges.filter((edge) => visibleIds.has(edge.from) && visibleIds.has(edge.to));

 const toggleType = (type: KnowledgeNodeType) => {
 setEnabledTypes((current) => {
 const next = new Set(current);
 if (next.has(type)) next.delete(type);
 else next.add(type);
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
 <rect width={layout.width} height={layout.height} fill="var(--tn-card)" />
 {visibleEdges.map((edge) => {
 const from = layout.positions.get(edge.from);
 const to = layout.positions.get(edge.to);
 if (!from || !to) return null;
 return (
 <line
 key={edge.id}
 x1={from.x + 88}
 y1={from.y}
 x2={to.x - 88}
 y2={to.y}
 stroke={edge.kind === 'contains' ? 'var(--tn-fg-muted)' : 'var(--tn-accent)'}
 strokeOpacity={edge.kind === 'contains' ? 0.24 : 0.42}
 strokeWidth={edge.kind === 'contains' ? 1.4 : 1.8}
 strokeDasharray={edge.kind === 'tagged' ? '4 5' : undefined}
 />
 );
 })}
 {Array.from(layout.positions.values()).map((node) => (
 <a key={node.id} href={node.href} aria-label={`Open ${node.type}: ${node.label}`}>
 <g className="cursor-pointer">
 <title>{node.type}: {node.label}</title>
 <rect
 x={node.x - 88}
 y={node.y - 22}
 width={176}
 height={44}
 rx={14}
 fill={nodeFill(node.type)}
 stroke={nodeStroke(node.type)}
 strokeWidth={1.4}
 />
 <text x={node.x - 75} y={node.y - 5} fill="var(--tn-fg)" fontSize={12} fontWeight={700}>
 {truncate(node.label, 23)}
 </text>
 <text x={node.x - 75} y={node.y + 12} fill="var(--tn-fg-muted)" fontSize={9}>
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

export default withAuth(GraphPage);
