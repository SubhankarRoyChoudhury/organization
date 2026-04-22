import type { NextConfig } from "next";

const backendApiOrigin =
  process.env.BACKEND_API_ORIGIN?.trim() || "http://0.0.0.0:8000";

const nextConfig: NextConfig = {
  basePath: "/clinic-management",
  trailingSlash: true,
  reactCompiler: true,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendApiOrigin}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
