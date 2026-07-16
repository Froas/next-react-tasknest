import { expect, test } from '@playwright/test';
import { expectNoDocumentOverflow } from './mobile-helpers';

test('web app manifest exposes installable icons and app shortcuts', async ({ page, request }) => {
  await page.goto('/login');

  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    'href',
    '/manifest.webmanifest',
  );

  const manifestResponse = await request.get('/manifest.webmanifest');
  expect(manifestResponse.ok()).toBe(true);
  expect(manifestResponse.headers()['content-type']).toContain('application/manifest+json');

  const manifest = await manifestResponse.json();
  expect(manifest).toMatchObject({
    name: 'TaskNest',
    short_name: 'TaskNest',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    prefer_related_applications: false,
  });
  expect(manifest.icons).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ sizes: '192x192', type: 'image/png', purpose: 'any' }),
      expect.objectContaining({ sizes: '512x512', type: 'image/png', purpose: 'any' }),
      expect.objectContaining({ sizes: '512x512', type: 'image/png', purpose: 'maskable' }),
    ]),
  );
  expect(manifest.shortcuts).toHaveLength(3);
  expect(manifest.shortcuts).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ name: 'Today', url: '/today' }),
    ]),
  );

  for (const icon of manifest.icons) {
    const iconResponse = await request.get(icon.src);
    expect(iconResponse.ok(), `${icon.src} is missing`).toBe(true);
    expect(iconResponse.headers()['content-type']).toContain('image/png');
  }
});

test('service worker installs and takes control without caching private pages', async ({ page }) => {
  await page.goto('/login');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();

  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
    .toBe(true);

  const cacheKeys = await page.evaluate(async () => caches.keys());
  expect(cacheKeys).toContain('tasknest-pwa-v2-static');

  const cachedUrls = await page.evaluate(async () => {
    const cache = await caches.open('tasknest-pwa-v2-static');
    return (await cache.keys()).map((request) => new URL(request.url).pathname);
  });
  expect(cachedUrls).toContain('/offline.html');
  expect(cachedUrls).not.toContain('/login');
  expect(cachedUrls).not.toContain('/');
  expect(cachedUrls.some((url) => url.startsWith('/api/'))).toBe(false);
});

test('an offline navigation is handled by the narrow-phone fallback', async ({ page, context }) => {
  await page.goto('/login');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
    .toBe(true);

  await context.setOffline(true);
  try {
    await page.goto('/calendar', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'You’re offline' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
    await expectNoDocumentOverflow(page);
  } finally {
    await context.setOffline(false);
  }
});
