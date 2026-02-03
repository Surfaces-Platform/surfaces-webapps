import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['@surfaces/ui', '@surfaces/platform-auth'],
};

export default nextConfig;
