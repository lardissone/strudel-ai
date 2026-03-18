import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@strudel/repl", "@strudel/web"],
  allowedDevOrigins: ["parabola.metacompo.com"],
};

export default nextConfig;
