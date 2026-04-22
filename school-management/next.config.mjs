const defaultAllowedOrigins = [
  // Frontend dev ports
  "http://localhost:3021",
  "http://127.0.0.1:3021",
  "http://0.0.0.0:3021",
  "http://localhost:3006",
  "http://127.0.0.1:3006",
  "http://0.0.0.0:3006",
  "http://localhost:3012",
  "http://127.0.0.1:3012",
  "http://0.0.0.0:3012",
  // Host/port you’re using (from the error log)
  "http://localhost:86",
  "http://0.0.0.0:86",
  // Common backend/proxy ports for Django
  "http://localhost:8000",
  "http://127.0.0.1:8000",
  "http://0.0.0.0:8000",
];

const backendApiOrigin =
  process.env.BACKEND_API_ORIGIN?.trim() || "http://0.0.0.0:8000";
/** @type {import('next').NextConfig} */

const nextConfig = {
  basePath: "/school-management",
  assetPrefix: "/school-management/",
  output: "standalone",
  eslint: { ignoreDuringBuilds: true },
  trailingSlash: true,
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
