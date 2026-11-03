import type { NextConfig } from "next";
import { buildApiRewrites } from "./lib/api/base-url";

const nextConfig: NextConfig = {
  // HMR depuis le LAN (IP DHCP : relancer `next dev` si elle change).
  allowedDevOrigins: ["192.168.1.22", "192.168.1.6"],
  // Next.js 16 : transpile les packages locaux du monorepo (npm workspaces).
  transpilePackages: ["@sonar/api-contract"],
  // Une seule origine : /api/* est relayé vers l'API si API_DIRECT_URL est défini
  // (adresse serveur uniquement) ; sinon aucune règle.
  async rewrites() {
    return buildApiRewrites(process.env.API_DIRECT_URL);
  },
};

export default nextConfig;
