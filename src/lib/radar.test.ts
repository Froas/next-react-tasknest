import { describe, expect, it } from 'vitest';
import type { NoteItem } from '@/lib/api';
import { isRadarDue, radarBucket, validateRadarDecision } from '@/lib/radar';

const signal = (patch: Partial<NoteItem> = {}): NoteItem => ({
 id: 'signal-1',
 title: 'A weak signal',
 pinned: false,
 kind: 'signal',
 created_at: '2026-07-13T00:00:00Z',
 updated_at: '2026-07-13T00:00:00Z',
 ...patch,
});

describe('radar workflow', () => {
 it('keeps undecided signals in inbox', () => {
 expect(radarBucket(signal())).toBe('inbox');
 });

 it('separates ignored and completed signals', () => {
 expect(radarBucket(signal({ signal_decision: 'ignore', resolved_at: '2026-07-13T01:00:00Z' }))).toBe('ignored');
 expect(radarBucket(signal({ signal_decision: 'act', resolved_at: '2026-07-13T01:00:00Z' }))).toBe('done');
 });

 it('marks review dates and deadlines as due', () => {
 expect(isRadarDue(signal({ signal_decision: 'watch', review_date: '2026-07-13' }), '2026-07-13')).toBe(true);
 expect(isRadarDue(signal({ signal_decision: 'act', deadline: '2026-07-14' }), '2026-07-13')).toBe(false);
 });

 it('requires review dates for watch and test', () => {
 expect(validateRadarDecision('watch', null)).toBeTruthy();
 expect(validateRadarDecision('test', '2026-07-20')).toBeNull();
 });
});
