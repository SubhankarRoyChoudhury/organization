const defaultAllowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://0.0.0.0:3000",
  "http://localhost:8000",
  "http://127.0.0.1:8000",
  "http://0.0.0.0:8000",
];

const backendApiOrigin =
  process.env.BACKEND_API_ORIGIN?.trim() || "http://0.0.0.0:8000";

const basePath = "";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  basePath,
  assetPrefix: basePath,
  allowedDevOrigins: (
    process.env.ALLOWED_DEV_ORIGINS?.split(",").map((origin) =>
      origin.trim(),
    ) ?? defaultAllowedOrigins
  ).filter(Boolean),
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
