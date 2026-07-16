import { expect, type Page } from '@playwright/test';

export async function expectNoDocumentOverflow(page: Page) {
 const dimensions = await page.evaluate(() => ({
 viewport: window.innerWidth,
 document: document.documentElement.scrollWidth,
 body: document.body.scrollWidth,
 }));

 expect(
 Math.max(dimensions.document, dimensions.body),
 `Page overflows horizontally: viewport=${dimensions.viewport}, document=${dimensions.document}, body=${dimensions.body}`,
 ).toBeLessThanOrEqual(dimensions.viewport + 1);
}

export async function expectLocatorInsideViewport(page: Page, selector: string) {
 const locator = page.locator(selector).first();
 await expect(locator).toBeVisible();
 const box = await locator.boundingBox();
 expect(box, `${selector} has no bounding box`).not.toBeNull();
 if (!box) return;

 const viewport = page.viewportSize();
 expect(viewport).not.toBeNull();
 if (!viewport) return;

 expect(box.x, `${selector} starts outside the viewport`).toBeGreaterThanOrEqual(-1);
 expect(box.x + box.width, `${selector} ends outside the viewport`).toBeLessThanOrEqual(viewport.width + 1);
}

export async function expectMinimumTouchTarget(page: Page, selector: string, minimum = 44) {
 const locator = page.locator(selector).first();
 await expect(locator).toBeVisible();
 const box = await locator.boundingBox();
 expect(box, `${selector} has no bounding box`).not.toBeNull();
 if (!box) return;
 expect(Math.min(box.width, box.height), `${selector} is smaller than ${minimum}px`).toBeGreaterThanOrEqual(minimum);
}

export async function loginWithE2ECredentials(page: Page) {
 const username = process.env.E2E_USERNAME;
 const password = process.env.E2E_PASSWORD;
 if (!username || !password) return false;

 await page.goto('/login');
 await page.getByLabel('Username').fill(username);
 await page.getByLabel('Password').fill(password);
 await page.getByRole('button', { name: 'Sign In' }).click();
 await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 20_000 });
 return true;
}
