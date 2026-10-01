import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "12mb",
    },
  },
  // A Supabase-kliens minden oldalon példányosul, és a build statikus
  // generálás közben is lefutna — ott viszont nincs env-változó.
  // Ezért minden oldalt futásidőben renderelünk.
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
