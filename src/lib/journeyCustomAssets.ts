export type JourneyCustomAssetKind = 'environment' | 'character-sprite';

export interface JourneyCustomAssetMetadata {
  kind: JourneyCustomAssetKind;
  mimeType: string;
  byteSize: number;
  width: number;
  height: number;
  hasAlpha?: boolean;
  frameWidth?: number;
  frameHeight?: number;
  frameCount?: number;
}

export interface JourneyAssetValidationResult {
  valid: boolean;
  errors: string[];
}

const ALLOWED_MIME_TYPES = new Set(['image/png', 'image/webp']);
const ENVIRONMENT_MAX_BYTES = 5 * 1024 * 1024;
const SPRITE_MAX_BYTES = 2 * 1024 * 1024;

export const validateJourneyAssetMetadata = (
  metadata: JourneyCustomAssetMetadata,
): JourneyAssetValidationResult => {
  const errors: string[] = [];
  if (!ALLOWED_MIME_TYPES.has(metadata.mimeType)) errors.push('Only PNG and WebP assets are supported.');
  if (!Number.isInteger(metadata.width) || !Number.isInteger(metadata.height) || metadata.width <= 0 || metadata.height <= 0) {
    errors.push('Asset dimensions must be positive integers.');
  }

  if (metadata.kind === 'environment') {
    if (metadata.byteSize <= 0 || metadata.byteSize > ENVIRONMENT_MAX_BYTES) errors.push('Environment assets must be 5 MB or smaller.');
    if (metadata.width < 600 || metadata.height < 360 || metadata.width > 2400 || metadata.height > 1440) {
      errors.push('Environment dimensions must be between 600×360 and 2400×1440.');
    }
    const ratio = metadata.width / metadata.height;
    if (Math.abs(ratio - (5 / 3)) > 0.08) errors.push('Environment assets must use an approximately 5:3 aspect ratio.');
  } else {
    if (metadata.byteSize <= 0 || metadata.byteSize > SPRITE_MAX_BYTES) errors.push('Sprite sheets must be 2 MB or smaller.');
    if (!metadata.hasAlpha) errors.push('Sprite sheets require transparency.');
    const frameWidth = metadata.frameWidth ?? 0;
    const frameHeight = metadata.frameHeight ?? 0;
    const frameCount = metadata.frameCount ?? 0;
    if (frameWidth !== 32 || frameHeight !== 32) errors.push('Each sprite frame must be exactly 32×32 pixels.');
    if (!Number.isInteger(frameCount) || frameCount < 2 || frameCount > 12) errors.push('Sprite sheets require between 2 and 12 frames.');
    if (metadata.height !== frameHeight || metadata.width !== frameWidth * frameCount) {
      errors.push('Sprite sheet dimensions must match one horizontal row of frames.');
    }
  }

  return { valid: errors.length === 0, errors };
};
