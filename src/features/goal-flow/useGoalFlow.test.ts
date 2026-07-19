import { describe, expect, it } from 'vitest';
import { toApiDateTime } from './useGoalFlow';

describe('toApiDateTime', () => {
 it('leaves an existing ISO datetime unchanged', () => {
 expect(toApiDateTime('2026-07-14T03:00:00.000Z')).toBe('2026-07-14T03:00:00.000Z');
 });

 it('turns a date input into an API-safe datetime', () => {
 const value = toApiDateTime('2026-07-14');
 expect(value).toContain('T');
 expect(Number.isNaN(new Date(value!).getTime())).toBe(false);
 });

 it('keeps an empty optional date empty', () => {
 expect(toApiDateTime()).toBeUndefined();
 });
});
