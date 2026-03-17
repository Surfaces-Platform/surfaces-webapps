import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.resolve(__dirname, "../.."),
  ...(process.env.SURFACEOPS_NEXT_DIST_DIR
    ? { distDir: process.env.SURFACEOPS_NEXT_DIST_DIR }
    : {}),
  transpilePackages: ['@surfaces/ui', '@surfaces/platform-auth'],
};

export default nextConfig;
