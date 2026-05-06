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
  // Keep these heavy, browser-only packages out of the server bundle entirely.
  // Even though pdf-editor/page.tsx uses dynamic({ ssr: false }), Next.js can
  // still pull them into the server trace; marking them external prevents the
  // server worker from loading them and avoids the uncaughtException that was
  // causing the 52-second event-loop latency spikes.
  serverExternalPackages: ["pdfjs-dist", "pdf-lib", "canvas"],
  // Exclude heavy browser-only packages from the file-system trace that Next.js
  // runs after compilation. Without this the trace worker process tries to walk
  // the entire pdfjs-dist tree, overflows its IPC buffer, and dies with ECONNRESET.
  outputFileTracingExcludes: {
    "*": [
      "node_modules/pdfjs-dist/**/*",
      "node_modules/pdf-lib/**/*",
      "node_modules/canvas/**/*",
    ],
  },
  webpack(config, { isServer }) {
    if (isServer) {
      // Completely prevent pdfjs-dist and pdf-lib from being resolvable in the
      // server-side webpack graph. Even with serverExternalPackages, webpack may
      // still include them in the server trace if they appear in any import chain.
      // Setting the alias to false replaces the import with an empty module,
      // which stops the "kill[...] is not a function" / "returnNaN is not defined"
      // uncaughtException that fires when the pdfjs worker code runs in Node.js.
      config.resolve.alias = {
        ...config.resolve.alias,
        "pdfjs-dist": false,
        "pdf-lib": false,
      };
    }
    return config;
  },
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
