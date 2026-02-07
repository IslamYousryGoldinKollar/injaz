import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    serverActions: {
      allowedOrigins: [
        "localhost:9002",
        "injaz.goldinkollar.com",
      ],
    },
  },
};

export default nextConfig;
