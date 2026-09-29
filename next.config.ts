import type { NextConfig } from "next";

// Bare-bones config: no images.domains/remotePatterns (we render plain
// <img> tags, not next/image), no rewrites, no headers, no middleware.
const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
