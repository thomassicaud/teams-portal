import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configuration pour le support Docker
  output: 'standalone',
  
  // Configuration pour le développement local
  experimental: {
    // Configuration expérimentale si nécessaire
  },
  
  // Configuration pour la production
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  
  // Optimisations pour Docker
  poweredByHeader: false,
  compress: true,
};

export default nextConfig;
