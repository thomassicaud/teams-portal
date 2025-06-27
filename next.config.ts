import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow cross-origin requests from local network IPs for development
  experimental: {
    allowedDevOrigins: [
      '192.168.10.214', // Your current IP
      '192.168.*.*',    // All local network IPs
      '10.*.*.*',       // Private network range
      '172.16.*.*',     // Private network range
    ],
  },
};

export default nextConfig;
