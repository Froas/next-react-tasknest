import type { NoteItem, SignalDecision } from '@/lib/api';

export type RadarBucket = 'inbox' | 'watch' | 'test' | 'act' | 'ignored' | 'done';

export const RADAR_BUCKETS: Array<{ id: RadarBucket; label: string }> = [
 { id: 'inbox', label: 'Inbox' },
 { id: 'watch', label: 'Watch' },
 { id: 'test', label: 'Test' },
 { id: 'act', label: 'Act' },
 { id: 'ignored', label: 'Ignored' },
 { id: 'done', label: 'Done' },
];

export const radarBucket = (signal: NoteItem): RadarBucket => {
 if (signal.resolved_at) return signal.signal_decision === 'ignore' ? 'ignored' : 'done';
 if (signal.signal_decision === 'ignore') return 'ignored';
 return signal.signal_decision ?? 'inbox';
};

export const isRadarDue = (signal: NoteItem, todayKey: string) => {
 if (signal.kind !== 'signal' || signal.resolved_at) return false;
 return Boolean(
 (signal.review_date && signal.review_date <= todayKey) ||
 (signal.deadline && signal.deadline <= todayKey),
 );
};

export const validateRadarDecision = (
 decision: SignalDecision | null | undefined,
 reviewDate: string | null | undefined,
) => {
 if ((decision === 'watch' || decision === 'test') && !reviewDate) {
 return 'Choose a review date for watch and test signals.';
 }
 return null;
};
