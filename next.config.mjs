/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_TIMESTAMP: new Date().toISOString(),
  },
  experimental: {
    serverComponentsExternalPackages: ['node:sqlite'],
  },
};

export default nextConfig;
