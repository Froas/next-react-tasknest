import { expect, test } from '@playwright/test';
import {
 expectMinimumTouchTarget,
 expectNoDocumentOverflow,
 loginWithE2ECredentials,
} from './mobile-helpers';

const criticalRoutes = [
 '/',
 '/goal',
 '/calendar',
 '/notes',
 '/review',
 '/activity',
 '/profile',
 '/templates',
 '/visualization',
];

test('critical authenticated pages do not overflow the mobile document', async ({ page }) => {
 test.skip(
 !process.env.E2E_USERNAME || !process.env.E2E_PASSWORD,
 'Set E2E_USERNAME and E2E_PASSWORD to run authenticated mobile coverage.',
 );
 expect(await loginWithE2ECredentials(page)).toBe(true);

 for (const route of criticalRoutes) {
 await page.goto(route);
 await expect(page).not.toHaveURL(/\/login/);
 await page.waitForLoadState('domcontentloaded');
 await expectNoDocumentOverflow(page);
 }
});

test('mobile navigation drawer exposes the primary application routes', async ({ page }) => {
 test.skip(
 !process.env.E2E_USERNAME || !process.env.E2E_PASSWORD,
 'Set E2E_USERNAME and E2E_PASSWORD to run authenticated mobile coverage.',
 );
 expect(await loginWithE2ECredentials(page)).toBe(true);

 const menuButton = page.getByRole('button', { name: 'Open menu' });
 await expectMinimumTouchTarget(page, '.tn-shell-hamburger');
 await menuButton.click();

 await expect(page.getByRole('link', { name: 'Today' })).toBeVisible();
 await expect(page.getByRole('link', { name: 'Goals' })).toBeVisible();
 await expect(page.getByRole('link', { name: 'Review' })).toBeVisible();
 await expect(page.getByRole('link', { name: 'Settings' })).toBeVisible();
});

test('review sub-navigation switches sections without causing page overflow', async ({ page }) => {
 test.skip(
 !process.env.E2E_USERNAME || !process.env.E2E_PASSWORD,
 'Set E2E_USERNAME and E2E_PASSWORD to run authenticated mobile coverage.',
 );
 expect(await loginWithE2ECredentials(page)).toBe(true);
 await page.goto('/review');

 const reviewNav = page.getByRole('navigation', { name: 'Review sections' });
 await expect(reviewNav).toBeVisible();
 await reviewNav.getByRole('button', { name: /Workload/ }).click();
 await expect(page.getByRole('heading', { name: 'Work Pressure' })).toBeVisible();
 await expectNoDocumentOverflow(page);

 await reviewNav.getByRole('button', { name: /Radar/ }).click();
 await expect(page.getByRole('heading', { name: 'Radar Workflow' })).toBeVisible();
 await expect(page.getByRole('heading', { name: 'Radar Map' })).toBeVisible();
 await expectNoDocumentOverflow(page);
});
