import { describe, expect, it } from 'vitest';
import type { TodoOccurrenceItem } from './api';
import { collectRecentRoutineActivity } from './recentActivity';

const occurrence = (
 id: string,
 status: TodoOccurrenceItem['status'],
 completedAt: string | null,
): TodoOccurrenceItem => ({
 id,
 date: '2026-07-14',
 status,
 completed_at: completedAt,
 todo_id: `todo-${id}`,
 created_at: '2026-07-14T08:00:00+09:00',
 updated_at: completedAt ?? '2026-07-14T08:00:00+09:00',
 todo_title: `Routine ${id}`,
 goal_title: 'Professional Radar',
 task_title: 'Signal Capture Loop',
});

describe('collectRecentRoutineActivity', () => {
 it('includes completed and minimum routine occurrences in newest-first order', () => {
 const items = collectRecentRoutineActivity([
 occurrence('open', 'open', null),
 occurrence('minimum', 'minimum', '2026-07-14T09:00:00+09:00'),
 occurrence('done', 'done', '2026-07-14T10:00:00+09:00'),
 ]);

 expect(items.map((item) => item.id)).toEqual(['done', 'minimum']);
 expect(items[0]).toMatchObject({
 kind: 'Routine',
 title: 'Routine done',
 goalTitle: 'Professional Radar',
 taskTitle: 'Signal Capture Loop',
 });
 });
});
