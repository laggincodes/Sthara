import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure browser source maps are not exposed publicly in production builds
  productionBrowserSourceMaps: false,
};

export default nextConfig;
