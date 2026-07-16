import { describe, expect, it } from 'vitest';
import { validateJourneyAssetMetadata } from './journeyCustomAssets';

describe('journey custom asset contract', () => {
  it('accepts a bounded environment image', () => {
    expect(validateJourneyAssetMetadata({
      kind: 'environment', mimeType: 'image/webp', byteSize: 800_000, width: 1200, height: 720,
    })).toEqual({ valid: true, errors: [] });
  });

  it('rejects SVG and oversized environment images', () => {
    const result = validateJourneyAssetMetadata({
      kind: 'environment', mimeType: 'image/svg+xml', byteSize: 7_000_000, width: 4000, height: 900,
    });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });

  it('accepts an eight-frame transparent sprite sheet', () => {
    expect(validateJourneyAssetMetadata({
      kind: 'character-sprite',
      mimeType: 'image/png',
      byteSize: 120_000,
      width: 256,
      height: 32,
      hasAlpha: true,
      frameWidth: 32,
      frameHeight: 32,
      frameCount: 8,
    })).toEqual({ valid: true, errors: [] });
  });

  it('rejects malformed or opaque sprite sheets', () => {
    const result = validateJourneyAssetMetadata({
      kind: 'character-sprite',
      mimeType: 'image/png',
      byteSize: 120_000,
      width: 250,
      height: 64,
      hasAlpha: false,
      frameWidth: 64,
      frameHeight: 64,
      frameCount: 4,
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Sprite sheets require transparency.');
    expect(result.errors).toContain('Each sprite frame must be exactly 32×32 pixels.');
  });
});
