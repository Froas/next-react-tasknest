import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3010';
const webServerPort = new URL(baseURL).port || '3000';

export default defineConfig({
 testDir: './e2e',
 outputDir: 'test-results',
 fullyParallel: false,
 forbidOnly: Boolean(process.env.CI),
 retries: process.env.CI ? 2 : 0,
 workers: process.env.CI ? 1 : undefined,
 reporter: process.env.CI
 ? [['line'], ['html', { open: 'never' }]]
 : [['list'], ['html', { open: 'never' }]],
 use: {
 baseURL,
 browserName: 'chromium',
 locale: 'en-US',
 timezoneId: 'Asia/Tokyo',
 hasTouch: true,
 isMobile: true,
 screenshot: 'only-on-failure',
 trace: 'retain-on-failure',
 video: 'retain-on-failure',
 },
 projects: [
 {
 name: 'mobile-320',
 use: { viewport: { width: 320, height: 568 }, deviceScaleFactor: 2 },
 },
 {
 name: 'mobile-390',
 use: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 },
 },
 {
 name: 'mobile-412',
 use: { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625 },
 },
 {
 name: 'iphone-webkit',
 use: { ...devices['iPhone 13'] },
 },
 ],
 webServer: process.env.E2E_NO_WEBSERVER
 ? undefined
 : {
 command: `rm -rf .next-e2e && NEXTAUTH_URL=${baseURL} NEXT_DIST_DIR=.next-e2e npm run build:pwa && NEXTAUTH_URL=${baseURL} NEXT_DIST_DIR=.next-e2e npm run start -- --hostname 127.0.0.1 --port ${webServerPort}`,
 url: baseURL,
 reuseExistingServer: !process.env.CI,
 timeout: 120_000,
 },
});
