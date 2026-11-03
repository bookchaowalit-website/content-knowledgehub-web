import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  pageExtensions: ['ts', 'tsx', 'md', 'mdx'],
  // /api/mcp is documented as a programmatic API for external consumers.
  // Without this, a browser-based client on another origin (e.g. a
  // DevHub-style Playground) can't read the response even though the
  // route itself works — see bookchaowalit-devhub-frontend's PRODUCT.md
  // for the CORS chain this pattern was first found fixing.
  async headers() {
    return [
      {
        source: '/api/mcp',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
      // The private shelf (SPEC-002) is owner-only: never cached, never indexed, 404s included.
      ...['/private', '/private/:path*'].map((source) => ({
        source,
        headers: [
          { key: 'Cache-Control', value: 'private, no-store' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      })),
    ];
  },
  // wiki.bookchaowalit.com was merged into this site on 2026-11-03; its domain points here
  // and every old URL lands on the matching knowledge entry (or the home index).
  async redirects() {
    const wiki = [{ type: 'host' as const, value: 'wiki.bookchaowalit.com' }];
    return [
      { source: '/wiki/:slug', has: wiki, destination: 'https://knowledgehub.bookchaowalit.com/knowledge/:slug', permanent: true },
      { source: '/:path*', has: wiki, destination: 'https://knowledgehub.bookchaowalit.com/', permanent: true },
    ];
  },
};

export default nextConfig;
