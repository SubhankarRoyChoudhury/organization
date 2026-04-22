const defaultAllowedOrigins = [
  // Frontend dev ports
  "http://localhost:3012",
  "http://127.0.0.1:3012",
  "http://0.0.0.0:3012",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://0.0.0.0:3000",
  // Host/port you’re using (from the error log)
  "http://localhost:92",
  "http://0.0.0.0:92",
  "http://localhost:83",
  "http://0.0.0.0:83",
  // Common backend/proxy ports for Django
  "http://localhost:8000",
  "http://127.0.0.1:8000",
  "http://0.0.0.0:8000",
];

const backendApiOrigin =
  process.env.BACKEND_API_ORIGIN?.trim() || "http://0.0.0.0:8000";

/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: "/hospital-management",

  trailingSlash: true,

  // Allow HMR and asset requests from non-default hosts/ports in dev
  allowedDevOrigins: (
    process.env.ALLOWED_DEV_ORIGINS?.split(",").map((origin) =>
      origin.trim()
    ) ?? defaultAllowedOrigins
  ).filter(Boolean),
  async rewrites() {
    // Proxy /api/* to the backend to avoid CORS issues in dev
    return [
      {
        source: "/api/:path*",
        destination: `${backendApiOrigin}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
