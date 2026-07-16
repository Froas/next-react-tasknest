# TaskNest PWA

TaskNest can be installed from a production build and opens in a standalone app window. The first visit must be online so the browser can install the service worker and offline fallback.

## Install

### iPhone or iPad

1. Open the HTTPS TaskNest address in Safari.
2. Sign in.
3. Tap **Share**.
4. Choose **Add to Home Screen** and confirm.

### Android

Open the HTTPS TaskNest address in Chrome and use the in-app **Install** prompt or Chrome menu → **Install app**.

### Desktop

Open TaskNest in Chrome or Edge and use the install icon in the address bar. Safari on recent macOS versions offers **Add to Dock**.

## Security and offline behavior

- HTTPS is required outside `localhost`.
- Authenticated HTML, API responses, notes, goals, and metrics are never written to Cache Storage.
- Only versioned frontend assets, PWA icons, theme artwork, and the static offline screen are cached.
- When the server is unavailable, navigation shows the offline screen instead of stale private data.

## Verify locally

```bash
npm run build:pwa
npm start
```

Then open `http://localhost:3000`. Browsers treat `localhost` as a secure context. A phone opening a plain `http://192.168.x.x` LAN address does not; use the deployed HTTPS address on a real phone.

Run the automated checks with:

```bash
npm run test:pwa
npm run test:mobile
```

The Playwright server uses an isolated `.next-e2e` production build because service workers are intentionally not registered by `next dev` behavior alone.
