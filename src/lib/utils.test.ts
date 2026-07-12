import { describe, it, expect } from 'vitest';
import { stripMarkdown, toDateInput, toDateTimeInput, toOptionalDateInput, toOptionalDateTimeInput } from './utils';

describe('stripMarkdown', () => {
 it('returns empty string for nullish input', () => {
 expect(stripMarkdown(undefined)).toBe('');
 expect(stripMarkdown(null)).toBe('');
 expect(stripMarkdown('')).toBe('');
 });

 it('strips bold/italic/code', () => {
 expect(stripMarkdown('**bold** and *italic* and `code`')).toBe('bold and italic and code');
 });

 it('replaces link syntax with link text', () => {
 expect(stripMarkdown('See [docs](https://example.com)')).toBe('See docs');
 });

 it('flattens bullet markers to bullet char', () => {
 expect(stripMarkdown('- one\n- two')).toBe('• one • two');
 });

 it('strips ordered list markers', () => {
 expect(stripMarkdown('1. first\n2. second')).toBe('first second');
 });

 it('joins paragraph breaks with middot', () => {
 expect(stripMarkdown('para one\n\npara two')).toBe('para one · para two');
 });
});

describe('toDateInput', () => {
 it('formats ISO datetime as YYYY-MM-DD', () => {
 expect(toDateInput('2026-04-30T15:30:00Z')).toBe('2026-04-30');
 });

 it('falls back to today when input is missing', () => {
 const result = toDateInput(undefined);
 expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
 });

 it('falls back to today when input is unparseable', () => {
 const result = toDateInput('not-a-date');
 expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
 });
});

describe('toDateTimeInput', () => {
 it('formats ISO as YYYY-MM-DDTHH:mm', () => {
 expect(toDateTimeInput('2026-04-30T15:30:45')).toBe('2026-04-30T15:30');
 });

 it('handles missing input by returning current time', () => {
 const result = toDateTimeInput(undefined);
 expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
 });
});

describe('optional date inputs', () => {
 it('returns empty string for missing optional date values', () => {
 expect(toOptionalDateInput(undefined)).toBe('');
 expect(toOptionalDateTimeInput(undefined)).toBe('');
 });

 it('formats optional datetime values for datetime-local controls', () => {
 expect(toOptionalDateTimeInput('2026-04-30T15:30:45')).toBe('2026-04-30T15:30');
 });
});
