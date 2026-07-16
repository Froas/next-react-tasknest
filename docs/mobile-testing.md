# Mobile testing

TaskNest uses Playwright mobile emulation at three Chromium viewport sizes:

- 320 × 568 — smallest supported phone layout;
- 390 × 844 — current iPhone-sized layout;
- 412 × 915 — common Android-sized layout.

The suite also runs an iPhone 13 project in WebKit to cover the iOS browser engine.

## Public mobile checks

These start the frontend automatically and do not require an account:

```bash
npm run test:mobile:public
```

Run only the iPhone/WebKit checks with:

```bash
npm run test:mobile:webkit
```

They verify login/signup containment, protected-route redirects, minimum primary touch targets, iOS-safe input font sizes, and theme rendering across all design themes.

## Authenticated mobile checks

Use a dedicated local test account. The values are read only by Playwright and are not committed:

```bash
E2E_USERNAME=mobile-test E2E_PASSWORD='local-test-password' npm run test:mobile:auth
```

The backend must be available at the URL configured for the frontend. Authenticated tests cover the main application routes, document overflow, the mobile navigation drawer, and Review sub-navigation.

To test an already running frontend or a different port:

```bash
E2E_BASE_URL=http://127.0.0.1:3001 E2E_NO_WEBSERVER=1 npm run test:mobile
```

Failure artifacts are written to `test-results/`; the HTML report is written to `playwright-report/`.
