/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next.js 16 moved this from experimental to root level
  serverExternalPackages: ["@prisma/client"],

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.amazonaws.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        port: "",
        pathname: "/**",
      },
    ],
  },

  // Turbopack configuration (Next.js 16 default)
  turbopack: {
    // Add turbopack-specific config if needed
  },

  // Webpack fallback for compatibility
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
    };
    return config;
  },

  // Enable WebSocket support
  async rewrites() {
    return [
      {
        source: "/socket.io/:path*",
        destination: "/api/socket/:path*",
      },
    ];
  },
};

export default nextConfig;
