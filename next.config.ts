import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  // Allow server-side fetching from external RSS feeds
  serverExternalPackages: ['rss-parser'],
};

export default nextConfig;
