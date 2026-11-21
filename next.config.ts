import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [{ protocol: "https", hostname: "i.ytimg.com", pathname: "/vi/**" }],
  },
  async rewrites() {
    return [
      { source: "/gama-cyprus", destination: "/gama-cyprus/index.html" },
      { source: "/gama-cyprus/", destination: "/gama-cyprus/index.html" },
    ];
  },
};

export default nextConfig;
