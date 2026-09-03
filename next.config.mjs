/** @type {import('next').NextConfig} */
const isDevelopment = process.env.NODE_ENV !== "production"

const nextConfig = {
  // Package only the files required by the production server. Replit's
  // Autoscale image should not need the full build-time dependency tree.
  output: "standalone",
  // One-time URL version for development chunks that were previously served
  // with an immutable one-year cache. Production assets keep Next's defaults.
  deploymentId: isDevelopment ? "replit-dev-cache-reset-20260902" : undefined,
  typescript: {
    ignoreBuildErrors: false,
  },
  allowedDevOrigins: [
    "127.0.0.1",
    process.env.REPLIT_DEV_DOMAIN,
    "*.janeway.replit.dev",
    "*.replit.dev",
    "*.repl.co",
  ].filter(Boolean),
  images: {
    unoptimized: false,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "*.supabase.in",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "ui-avatars.com",
      },
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
  serverExternalPackages: [],
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
    optimizePackageImports: ["lucide-react"],
  },
  async redirects() {
    return [
      {
        source: "/index",
        destination: "/",
        permanent: true,
      },
      {
        source: "/leaderboard",
        destination: "/quiz/leaderboard",
        permanent: true,
      },
      {
        source: "/resources",
        destination: "/quiz",
        permanent: false,
      },
    ]
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'self' https://replit.com https://*.replit.com https://*.replit.dev",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      {
        source: "/_next/static/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: isDevelopment
              ? "no-store, no-cache, must-revalidate"
              : "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/api/(.*)",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate" },
        ],
      },
    ]
  },
}

export default nextConfig
