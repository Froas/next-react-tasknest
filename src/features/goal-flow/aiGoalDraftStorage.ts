import type { AIGoalDraft, AIGoalQuestion } from '@/lib/api';

export const AI_GOAL_DRAFT_STORAGE_KEY = 'tasknest.ai-goal-draft.v1';
export const AI_GOAL_DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export type PersistedAIGoalPlannerState = {
 version: 1;
 savedAt: number;
 stage: 'brief' | 'questions' | 'preview';
 intent: string;
 questions: AIGoalQuestion[];
 answers: Record<string, string>;
 resolvedAnswers: Array<{ question_id: string; question: string; value: string }>;
 draft: AIGoalDraft | null;
 assumptions: string[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
 typeof value === 'object' && value !== null && !Array.isArray(value);

export function parsePersistedAIGoalPlannerState(
 raw: string | null,
 now = Date.now(),
): PersistedAIGoalPlannerState | null {
 if (!raw) return null;
 try {
 const value: unknown = JSON.parse(raw);
 if (!isRecord(value) || value.version !== 1 || typeof value.savedAt !== 'number') return null;
 if (now - value.savedAt > AI_GOAL_DRAFT_MAX_AGE_MS || value.savedAt > now + 60_000) return null;
 if (!['brief', 'questions', 'preview'].includes(String(value.stage))) return null;
 if (typeof value.intent !== 'string') return null;
 const stage = value.stage as PersistedAIGoalPlannerState['stage'];
 const draft = isRecord(value.draft)
 && typeof value.draft.title === 'string'
 && typeof value.draft.success_criteria === 'string'
 && isRecord(value.draft.blueprint)
 ? value.draft as unknown as AIGoalDraft
 : null;
 if (stage === 'preview' && !draft) return null;
 return {
 version: 1,
 savedAt: value.savedAt,
 stage,
 intent: value.intent.slice(0, 2000),
 questions: Array.isArray(value.questions) ? value.questions as AIGoalQuestion[] : [],
 answers: isRecord(value.answers) ? value.answers as Record<string, string> : {},
 resolvedAnswers: Array.isArray(value.resolvedAnswers)
 ? value.resolvedAnswers as PersistedAIGoalPlannerState['resolvedAnswers']
 : [],
 draft,
 assumptions: Array.isArray(value.assumptions)
 ? value.assumptions.filter((item): item is string => typeof item === 'string').slice(0, 6)
 : [],
 };
 } catch {
 return null;
 }
}

export function loadAIGoalDraftState(): PersistedAIGoalPlannerState | null {
 if (typeof window === 'undefined') return null;
 try {
 const restored = parsePersistedAIGoalPlannerState(window.localStorage.getItem(AI_GOAL_DRAFT_STORAGE_KEY));
 if (!restored) window.localStorage.removeItem(AI_GOAL_DRAFT_STORAGE_KEY);
 return restored;
 } catch {
 return null;
 }
}

export function saveAIGoalDraftState(
 state: Omit<PersistedAIGoalPlannerState, 'version' | 'savedAt'>,
) {
 if (typeof window === 'undefined') return;
 try {
 if (!state.intent.trim() && !state.draft) {
 window.localStorage.removeItem(AI_GOAL_DRAFT_STORAGE_KEY);
 return;
 }
 const value: PersistedAIGoalPlannerState = {
 ...state,
 version: 1,
 savedAt: Date.now(),
 };
 window.localStorage.setItem(AI_GOAL_DRAFT_STORAGE_KEY, JSON.stringify(value));
 } catch {
 // Storage can be unavailable in private or locked-down browser contexts.
 }
}

export function clearAIGoalDraftState() {
 if (typeof window === 'undefined') return;
 try {
 window.localStorage.removeItem(AI_GOAL_DRAFT_STORAGE_KEY);
 } catch {
 // Nothing else to clear when browser storage is unavailable.
 }
}
