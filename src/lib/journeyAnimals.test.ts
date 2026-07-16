import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ANIMALS } from './journeyAnimals';

const PNG_SIGNATURE = '89504e470d0a1a0a';
const ORIGINAL_BAT_SHA256 = '2cd9531098ec101f40c8945d37412ff221ea1c864f3408dcfeb7337e84a6bcd8';

const readPngHeader = (assetPath: string) => {
  const bytes = readFileSync(join(process.cwd(), 'public', assetPath));
  return {
    bytes,
    signature: bytes.subarray(0, 8).toString('hex'),
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
    colorType: bytes[25],
  };
};

describe('journey animal assets', () => {
  it.each(Object.values(ANIMALS))('$name sheet matches its reusable config', (animal) => {
    const header = readPngHeader(animal.assetPath);
    expect(header.signature).toBe(PNG_SIGNATURE);
    expect(header.width).toBe(animal.frameWidth * animal.sheetColumns);
    expect(header.height).toBe(animal.frameHeight * animal.sheetRows);
    expect(header.colorType).toBe(6);
    expect(animal.animations.moving.frameCount).toBeGreaterThan(1);
    expect(animal.animations.moving.frameStart + animal.animations.moving.frameCount).toBeLessThanOrEqual(animal.sheetColumns);
  });

  it('protects the original Bat asset from accidental edits', () => {
    const { bytes } = readPngHeader(ANIMALS.bat.assetPath);
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(ORIGINAL_BAT_SHA256);
  });

  it('uses normalized v3 sheets for every non-Bat production character', () => {
    const productionCharacters = Object.values(ANIMALS).filter(({ id }) => id !== 'bat' && id !== 'bat-v2');
    expect(productionCharacters).toHaveLength(9);
    for (const character of productionCharacters) {
      expect(character.assetPath).toBe(`animals/v3/${character.id}.png`);
      expect(character.frameWidth).toBe(32);
      expect(character.frameHeight).toBe(32);
      expect(character.sheetColumns).toBe(8);
      expect(character.outlineMode).toBe('native');
    }
  });
});
