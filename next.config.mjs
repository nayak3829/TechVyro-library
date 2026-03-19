/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Disable body size limit for large file uploads
  serverExternalPackages: [],
  experimental: {
    serverActions: {
      bodySizeLimit: "500mb",
    },
  },
}

export default nextConfig
