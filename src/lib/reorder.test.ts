import { describe, expect, it } from 'vitest';
import { moveIdRelative } from './reorder';

describe('moveIdRelative', () => {
 it('moves an id before a target', () => {
 expect(moveIdRelative(['a', 'b', 'c', 'd'], 'd', 'b', 'before')).toEqual(['a', 'd', 'b', 'c']);
 });

 it('moves an id after a target', () => {
 expect(moveIdRelative(['a', 'b', 'c', 'd'], 'a', 'c', 'after')).toEqual(['b', 'c', 'a', 'd']);
 });

 it('keeps order when ids are invalid', () => {
 const ordered = ['a', 'b', 'c'];
 expect(moveIdRelative(ordered, 'x', 'b', 'before')).toBe(ordered);
 expect(moveIdRelative(ordered, 'a', 'a', 'after')).toBe(ordered);
 });
});
