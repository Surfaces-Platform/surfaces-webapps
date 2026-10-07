import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['@surfaces/ui', '@surfaces/platform-auth'],
  async headers() {
    return [
      {
        source: "/experiments/tide-design-e4d3995ea83653d2/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
          { key: "Referrer-Policy", value: "no-referrer" },
        ],
      },
    ];
  },
};

export default nextConfig;
