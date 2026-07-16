/** @type {import('next').NextConfig} */

import createBundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = createBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig = {
  // Mobile E2E uses an isolated build directory so it can run next to a
  // developer's active `next dev` process without corrupting either cache.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  reactStrictMode: true,
  // The development server is reached through this Cloudflare hostname.
  // Next.js blocks cross-origin HMR/dev assets unless the host is explicit.
  allowedDevOrigins: ['tasknest.froas.dev'],
  async rewrites() {
    // Keep browser API calls same-origin. This is especially important when
    // the frontend is exposed through a tunnel: `localhost:8000` in browser
    // code would otherwise point at the visitor's machine, not this server.
    const apiUrl = (process.env.API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
    return [
      {
        source: '/backend/:path*',
        destination: `${apiUrl}/:path*`,
      },
    ];
  },
  async headers() {
    const headers = [
      {
        source: '/serviceWorker.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      {
        source: '/manifest.webmanifest',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' }],
      },
      {
        source: '/reset-pwa.html',
        headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }],
      },
    ];

    // Turbopack development chunk names are not content-stable. A browser,
    // service worker, or Cloudflare edge serving an older chunk alongside a
    // newer module graph causes "module factory is not available" crashes.
    if (process.env.NODE_ENV !== 'production') {
      headers.unshift({
        source: '/_next/:path*',
        headers: [
          { key: 'CDN-Cache-Control', value: 'no-store' },
          { key: 'Cloudflare-CDN-Cache-Control', value: 'no-store' },
        ],
      });
    }

    return headers;
  },
  // etc.
};

export default withBundleAnalyzer(nextConfig);
