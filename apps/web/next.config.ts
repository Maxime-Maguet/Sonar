import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.22"],
  // Next.js 16 : transpile les packages locaux du monorepo (npm workspaces).
  transpilePackages: ["@sonar/api-contract"],
};

export default nextConfig;
