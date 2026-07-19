import { describe, expect, it } from 'vitest';
import {
 AI_GOAL_DRAFT_MAX_AGE_MS,
 parsePersistedAIGoalPlannerState,
 type PersistedAIGoalPlannerState,
} from './aiGoalDraftStorage';

const state: PersistedAIGoalPlannerState = {
 version: 1,
 savedAt: 1_000_000,
 stage: 'brief',
 intent: 'Run a half marathon',
 questions: [],
 answers: {},
 resolvedAnswers: [],
 draft: null,
 assumptions: [],
};

describe('AI goal draft storage', () => {
 it('restores a current versioned draft', () => {
 expect(parsePersistedAIGoalPlannerState(JSON.stringify(state), state.savedAt + 1000)?.intent)
 .toBe('Run a half marathon');
 });

 it('drops expired or malformed drafts', () => {
 expect(parsePersistedAIGoalPlannerState(JSON.stringify(state), state.savedAt + AI_GOAL_DRAFT_MAX_AGE_MS + 1)).toBeNull();
 expect(parsePersistedAIGoalPlannerState('{bad json')).toBeNull();
 });

 it('does not restore a preview without its blueprint draft', () => {
 expect(parsePersistedAIGoalPlannerState(JSON.stringify({ ...state, stage: 'preview' }), state.savedAt + 1000)).toBeNull();
 });
});
