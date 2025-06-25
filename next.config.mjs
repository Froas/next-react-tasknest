/** @type {import('next').NextConfig} */

import createBundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = createBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig = {
  // твои остальные настройки, например:
  reactStrictMode: true,
  // etc.
};

export default withBundleAnalyzer(nextConfig);