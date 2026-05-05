import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Gzip/Brotli compress all API + page responses served by the Node process.
  compress: true,
  // Inline <link rel=preload> tags for JS/CSS so the browser starts fetching
  // critical assets before the full HTML is parsed.
  poweredByHeader: false,
  // Tell Next.js about long-lived static assets so it applies immutable cache headers.
  async headers() {
    return [
      {
        // Next.js _next/static assets already have immutable headers,
        // but this ensures any extra static files under /public get a long TTL.
        source: "/uploaded/:file*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=3600, stale-while-revalidate=86400",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
