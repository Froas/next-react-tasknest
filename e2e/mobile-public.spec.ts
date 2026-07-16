import { expect, test } from '@playwright/test';
import {
 expectLocatorInsideViewport,
 expectMinimumTouchTarget,
 expectNoDocumentOverflow,
} from './mobile-helpers';

const themes = [
 'notion',
 'glass',
 'bento',
 'glass-dark',
 'terminal',
 'brutalist',
 'pixel',
 'memphis',
 'sketchbook',
 'adventure',
 'solarpunk',
 'cottagecore',
 'cyber',
] as const;

test('login remains usable without horizontal overflow or iOS input zoom', async ({ page }) => {
 await page.goto('/login');

 await expect(page.getByRole('heading', { name: 'Log In' })).toBeVisible();
 await expectNoDocumentOverflow(page);
 await expectLocatorInsideViewport(page, '.auth-card');
 await expectMinimumTouchTarget(page, '.auth-button');

 for (const selector of ['#username', '#password']) {
 const fontSize = await page.locator(selector).evaluate((element) =>
 Number.parseFloat(getComputedStyle(element).fontSize),
 );
 expect(fontSize, `${selector} can trigger automatic iOS zoom`).toBeGreaterThanOrEqual(16);
 }
});

test('signup remains contained inside the mobile viewport', async ({ page }) => {
 await page.goto('/signup');
 await expectNoDocumentOverflow(page);
 await expectLocatorInsideViewport(page, '.auth-card');
});

test('protected pages preserve the requested path when redirecting to login', async ({ page }) => {
 await page.goto('/review');
 await expect(page).toHaveURL(/\/login\?redirect=%2Freview$/);
 await expectNoDocumentOverflow(page);
});

test('auth controls keep readable foreground/background pairs in every design theme', async ({ page }) => {
 for (const theme of themes) {
 await page.addInitScript((selectedTheme) => {
 window.localStorage.setItem('tasknest-design-theme', selectedTheme);
 }, theme);
 await page.goto('/login');
 await expect(page.locator('html')).toHaveAttribute('data-theme', theme);

 const colors = await page.locator('.auth-button').evaluate((element) => {
 const style = getComputedStyle(element);
 return { color: style.color, background: style.backgroundColor };
 });
 expect(colors.color, `${theme}: button text is transparent`).not.toBe('rgba(0, 0, 0, 0)');
 expect(colors.background, `${theme}: button background is transparent`).not.toBe('rgba(0, 0, 0, 0)');
 }
});
