import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const FRAME_SIZE = 32;
const FRAME_COUNT = 8;

const specs = {
  eagle: {
    key: 'green',
    anchor: 'air',
    box: [28, 24],
    sequence: [0, 1, 2, 3, 4, 3, 2, 1],
    alignX: 'right',
    alignY: 'bottom',
    palette: ['#17171d', '#382721', '#654433', '#8f6547', '#b7b0a5', '#e7e3d9', '#e7ac19'],
  },
  'snow-leopard': {
    key: 'magenta',
    anchor: 'ground',
    box: [29, 18],
    alignX: 'right',
    alignY: 'bottom',
    bridgeComponents: true,
    palette: ['#171820', '#4a4d5c', '#747989', '#aeb3bd', '#d8e6eb', '#ebe9e0', '#5fb6d6'],
  },
  owl: {
    key: 'green',
    anchor: 'air',
    box: [28, 24],
    sequence: [0, 1, 2, 3, 4, 3, 2, 1],
    alignY: 'bottom',
    palette: ['#17171d', '#3d2e2b', '#62483b', '#8a6d55', '#d8c4a0', '#ece9df', '#f0b921'],
  },
  'mountain-goat': {
    key: 'magenta',
    anchor: 'ground',
    box: [25, 25],
    alignX: 'right',
    alignY: 'bottom',
    bridgeComponents: true,
    palette: ['#18191f', '#3f4144', '#72716b', '#a8a394', '#d7d0b9', '#f1e9ce', '#7c6f56'],
  },
  fox: {
    key: 'green',
    anchor: 'ground',
    box: [28, 18],
    alignX: 'right',
    alignY: 'bottom',
    bridgeComponents: true,
    palette: ['#17171d', '#3b2622', '#7a2d1a', '#c94f20', '#e77735', '#eee1c4', '#d0b28e'],
  },
  salamander: {
    key: 'green',
    anchor: 'ground',
    box: [28, 15],
    alignX: 'right',
    alignY: 'bottom',
    palette: ['#17171d', '#432626', '#6f2c20', '#a9381f', '#e65425', '#ff7b32', '#d39a3e'],
  },
  'baby-dragon': {
    key: 'green',
    anchor: 'air',
    box: [28, 24],
    sequence: [0, 1, 2, 3, 4, 3, 2, 1],
    alignX: 'right',
    alignY: 'bottom',
    palette: ['#17171d', '#29293a', '#3c3b55', '#575571', '#77728b', '#a093bd', '#f0b829'],
  },
  'manta-ray': {
    key: 'magenta',
    anchor: 'air',
    box: [29, 17],
    alignX: 'right',
    alignY: 'bottom',
    palette: ['#141923', '#243047', '#35455f', '#4c627e', '#7386a0', '#e5e6df', '#ffffff'],
  },
  'sea-turtle': {
    key: 'magenta',
    anchor: 'air',
    box: [27, 19],
    sourceFrameCount: 7,
    sequence: [0, 1, 2, 3, 4, 5, 6, 5],
    alignX: 'right',
    alignY: 'bottom',
    palette: ['#171b16', '#2f4023', '#506334', '#78844d', '#a2a16b', '#c1c09a', '#e0dcc0'],
  },
};

const parseHex = (hex) => [
  Number.parseInt(hex.slice(1, 3), 16),
  Number.parseInt(hex.slice(3, 5), 16),
  Number.parseInt(hex.slice(5, 7), 16),
];

const isKeyPixel = (red, green, blue, key) => key === 'green'
  ? green > 145 && green > red * 1.28 && green > blue * 1.28
  : red > 135 && blue > 135 && green < Math.min(red, blue) * 0.78;

const nearestPaletteColor = (red, green, blue, palette) => {
  let best = palette[0];
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const color of palette) {
    const redDelta = red - color[0];
    const greenDelta = green - color[1];
    const blueDelta = blue - color[2];
    const distance = redDelta * redDelta + greenDelta * greenDelta + blueDelta * blueDelta;
    if (distance < bestDistance) {
      best = color;
      bestDistance = distance;
    }
  }
  return best;
};

const createTransparentFrame = () => Buffer.alloc(FRAME_SIZE * FRAME_SIZE * 4);

const detectSourceFrames = ({ source, sourceWidth, sourceHeight, spec }) => {
  const pixelCount = sourceWidth * sourceHeight;
  const foreground = new Uint8Array(pixelCount);
  const queue = new Int32Array(pixelCount);
  for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex += 1) {
    const offset = pixelIndex * 3;
    foreground[pixelIndex] = isKeyPixel(
      source[offset],
      source[offset + 1],
      source[offset + 2],
      spec.key,
    ) ? 0 : 1;
  }

  const components = [];
  for (let start = 0; start < pixelCount; start += 1) {
    if (!foreground[start]) continue;
    let head = 0;
    let tail = 0;
    let minX = sourceWidth;
    let minY = sourceHeight;
    let maxX = 0;
    let maxY = 0;
    queue[tail++] = start;
    foreground[start] = 0;
    while (head < tail) {
      const pixelIndex = queue[head++];
      const x = pixelIndex % sourceWidth;
      const y = Math.floor(pixelIndex / sourceWidth);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      for (let yDelta = -1; yDelta <= 1; yDelta += 1) {
        for (let xDelta = -1; xDelta <= 1; xDelta += 1) {
          if (xDelta === 0 && yDelta === 0) continue;
          const nextX = x + xDelta;
          const nextY = y + yDelta;
          if (nextX < 0 || nextY < 0 || nextX >= sourceWidth || nextY >= sourceHeight) continue;
          const nextIndex = nextY * sourceWidth + nextX;
          if (!foreground[nextIndex]) continue;
          foreground[nextIndex] = 0;
          queue[tail++] = nextIndex;
        }
      }
    }
    if (tail > 100) {
      components.push({
        pixels: queue.slice(0, tail),
        minX,
        minY,
        maxX,
        maxY,
      });
    }
  }

  const expectedCount = spec.sourceFrameCount ?? FRAME_COUNT;
  const frames = components
    .sort((left, right) => right.pixels.length - left.pixels.length)
    .slice(0, expectedCount)
    .sort((left, right) => left.minX - right.minX);
  if (frames.length !== expectedCount) {
    throw new Error(`Expected ${expectedCount} source poses, found ${frames.length}.`);
  }
  return frames;
};

const getOpaqueComponents = (frame) => {
  const visited = new Uint8Array(FRAME_SIZE * FRAME_SIZE);
  const components = [];
  const neighbors = [-1, 0, 1];

  for (let y = 0; y < FRAME_SIZE; y += 1) {
    for (let x = 0; x < FRAME_SIZE; x += 1) {
      const pixelIndex = y * FRAME_SIZE + x;
      if (visited[pixelIndex] || frame[pixelIndex * 4 + 3] === 0) continue;
      const queue = [[x, y]];
      const component = [];
      visited[pixelIndex] = 1;
      for (let cursor = 0; cursor < queue.length; cursor += 1) {
        const [currentX, currentY] = queue[cursor];
        component.push([currentX, currentY]);
        for (const yDelta of neighbors) {
          for (const xDelta of neighbors) {
            if (xDelta === 0 && yDelta === 0) continue;
            const nextX = currentX + xDelta;
            const nextY = currentY + yDelta;
            if (nextX < 0 || nextY < 0 || nextX >= FRAME_SIZE || nextY >= FRAME_SIZE) continue;
            const nextIndex = nextY * FRAME_SIZE + nextX;
            if (visited[nextIndex] || frame[nextIndex * 4 + 3] === 0) continue;
            visited[nextIndex] = 1;
            queue.push([nextX, nextY]);
          }
        }
      }
      components.push(component);
    }
  }
  return components.sort((left, right) => right.length - left.length);
};

const connectCloseComponents = (frame, outline) => {
  const components = getOpaqueComponents(frame);
  if (components.length < 2) return;
  const main = components[0];
  for (const component of components.slice(1)) {
    if (component.length < 2) continue;
    let closest = null;
    for (const [mainX, mainY] of main) {
      for (const [partX, partY] of component) {
        const distance = Math.hypot(partX - mainX, partY - mainY);
        if (!closest || distance < closest.distance) {
          closest = { mainX, mainY, partX, partY, distance };
        }
      }
    }
    if (!closest || closest.distance > 4.25) continue;
    const steps = Math.max(Math.abs(closest.partX - closest.mainX), Math.abs(closest.partY - closest.mainY));
    for (let step = 0; step <= steps; step += 1) {
      const x = Math.round(closest.mainX + (closest.partX - closest.mainX) * step / steps);
      const y = Math.round(closest.mainY + (closest.partY - closest.mainY) * step / steps);
      const offset = (y * FRAME_SIZE + x) * 4;
      frame[offset] = outline[0];
      frame[offset + 1] = outline[1];
      frame[offset + 2] = outline[2];
      frame[offset + 3] = 255;
    }
  }
};

const extractFrameCrop = ({ source, sourceWidth, sourceFrame }) => {
  const { minX, minY, maxX, maxY, pixels } = sourceFrame;
  const cropWidth = maxX - minX + 1;
  const cropHeight = maxY - minY + 1;
  const crop = Buffer.alloc(cropWidth * cropHeight * 4);
  for (const pixelIndex of pixels) {
    const sourceX = pixelIndex % sourceWidth;
    const sourceY = Math.floor(pixelIndex / sourceWidth);
    const sourceOffset = pixelIndex * 3;
    const targetOffset = ((sourceY - minY) * cropWidth + sourceX - minX) * 4;
    crop[targetOffset] = source[sourceOffset];
    crop[targetOffset + 1] = source[sourceOffset + 1];
    crop[targetOffset + 2] = source[sourceOffset + 2];
    crop[targetOffset + 3] = 255;
  }

  return { crop, cropWidth, cropHeight };
};

const buildFrame = async ({ crop, cropWidth, cropHeight, resizeRatio, spec }) => {
  const targetWidth = Math.max(1, Math.round(cropWidth * resizeRatio));
  const targetHeight = Math.max(1, Math.round(cropHeight * resizeRatio));
  const resized = await sharp(crop, { raw: { width: cropWidth, height: cropHeight, channels: 4 } })
    .resize(targetWidth, targetHeight, { kernel: sharp.kernel.lanczos3 })
    .raw()
    .toBuffer();

  const palette = spec.palette.map(parseHex);
  const frame = createTransparentFrame();
  const left = spec.alignX === 'right'
    ? FRAME_SIZE - targetWidth - 2
    : Math.round((FRAME_SIZE - targetWidth) / 2);
  const top = spec.alignY === 'bottom'
    ? FRAME_SIZE - targetHeight - 3
    : spec.anchor === 'ground'
    ? FRAME_SIZE - targetHeight - 1
    : Math.round((FRAME_SIZE - targetHeight) / 2);

  for (let y = 0; y < targetHeight; y += 1) {
    for (let x = 0; x < targetWidth; x += 1) {
      const sourceOffset = (y * targetWidth + x) * 4;
      if (resized[sourceOffset + 3] < 32) continue;
      const [red, green, blue] = nearestPaletteColor(
        resized[sourceOffset],
        resized[sourceOffset + 1],
        resized[sourceOffset + 2],
        palette,
      );
      const targetOffset = ((top + y) * FRAME_SIZE + left + x) * 4;
      frame[targetOffset] = red;
      frame[targetOffset + 1] = green;
      frame[targetOffset + 2] = blue;
      frame[targetOffset + 3] = 255;
    }
  }
  if (spec.bridgeComponents) connectCloseComponents(frame, palette[0]);
  return frame;
};

const buildSheet = async (name, spec, sourceDir, outputDir) => {
  const inputPath = path.join(sourceDir, `${name}.png`);
  const { data, info } = await sharp(inputPath).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const sourceFrames = detectSourceFrames({
    source: data,
    sourceWidth: info.width,
    sourceHeight: info.height,
    spec,
  });
  const sourceFrameIndices = Array.from(
    { length: FRAME_COUNT },
    (_, frameIndex) => spec.sequence?.[frameIndex] ?? frameIndex,
  );
  const crops = sourceFrameIndices.map((sourceFrameIndex) => extractFrameCrop({
    source: data,
    sourceWidth: info.width,
    sourceFrame: sourceFrames[sourceFrameIndex],
  }));
  const [maxWidth, maxHeight] = spec.box;
  const widestFrame = Math.max(...crops.map(({ cropWidth }) => cropWidth));
  const tallestFrame = Math.max(...crops.map(({ cropHeight }) => cropHeight));
  const resizeRatio = Math.min(maxWidth / widestFrame, maxHeight / tallestFrame);
  const frames = await Promise.all(crops.map((crop) => buildFrame({
    ...crop,
    resizeRatio,
    spec,
  })));

  const sheet = Buffer.alloc(FRAME_SIZE * FRAME_COUNT * FRAME_SIZE * 4);
  for (let frameIndex = 0; frameIndex < FRAME_COUNT; frameIndex += 1) {
    const frame = frames[frameIndex];
    for (let y = 0; y < FRAME_SIZE; y += 1) {
      const sourceStart = y * FRAME_SIZE * 4;
      const targetStart = (y * FRAME_SIZE * FRAME_COUNT + frameIndex * FRAME_SIZE) * 4;
      frame.copy(sheet, targetStart, sourceStart, sourceStart + FRAME_SIZE * 4);
    }
  }

  const outputPath = path.join(outputDir, `${name}.png`);
  await sharp(sheet, {
    raw: { width: FRAME_SIZE * FRAME_COUNT, height: FRAME_SIZE, channels: 4 },
  }).png().toFile(outputPath);
  return outputPath;
};

const sourceDir = process.argv[2] ?? 'tmp/imagegen/animals-v3-source';
const outputDir = process.argv[3] ?? 'public/animals/v3';
await mkdir(outputDir, { recursive: true });

for (const [name, spec] of Object.entries(specs)) {
  const outputPath = await buildSheet(name, spec, sourceDir, outputDir);
  process.stdout.write(`${outputPath}\n`);
}
