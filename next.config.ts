import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [{ protocol: "https", hostname: "i.ytimg.com", pathname: "/vi/**" }],
  },
  async headers() {
    return [
      {
        // photo filenames are content hashes, so they never change in place
        source: "/photos/:file*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
  async rewrites() {
    return [
      { source: "/gama-cyprus", destination: "/gama-cyprus/index.html" },
      { source: "/gama-cyprus/", destination: "/gama-cyprus/index.html" },
    ];
  },
};

export default nextConfig;
