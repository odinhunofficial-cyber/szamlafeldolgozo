import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A NAV-hívás és az AI-kiolvasás hosszabb ideig tarthat, mint az alapértelmezett
  // végrehajtási idő, ezért felemeljük a szerver-akciók limitjét.
  experimental: {
    serverActions: {
      bodySizeLimit: "12mb",
    },
  },
};

export default nextConfig;
