import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // HMR depuis le LAN (IP DHCP : relancer `next dev` si elle change).
  allowedDevOrigins: ["192.168.1.22", "192.168.1.6"],
  // Next.js 16 : transpile les packages locaux du monorepo (npm workspaces).
  transpilePackages: ["@sonar/api-contract"],
};

export default nextConfig;
