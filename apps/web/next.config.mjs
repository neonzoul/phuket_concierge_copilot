const API_ORIGIN = process.env.API_ORIGIN ?? "http://localhost:4100";

// Proxy same-origin /api/* calls to the Fastify API in dev/start so the browser never needs
// CORS headers from apps/api — the API server itself stays untouched by this UI.
/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_ORIGIN}/api/:path*` }];
  },
};

export default nextConfig;
