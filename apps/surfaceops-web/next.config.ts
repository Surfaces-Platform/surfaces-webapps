import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.SURFACEOPS_NEXT_DIST_DIR
    ? { distDir: process.env.SURFACEOPS_NEXT_DIST_DIR }
    : {}),
  transpilePackages: ['@surfaces/ui', '@surfaces/platform-auth'],
};

export default nextConfig;
