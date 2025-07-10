/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuration PWA
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate'
          },
          {
            key: 'Content-Type',
            value: 'application/javascript; charset=utf-8'
          }
        ]
      },
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate'
          },
          {
            key: 'Content-Type',
            value: 'application/manifest+json'
          }
        ]
      },
      {
        source: '/icons/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      }
    ];
  },

  // Optimisations pour PWA
  experimental: {
    optimizeCss: true
  },

  // Configuration pour les assets statiques
  async rewrites() {
    return [
      {
        source: '/sw.js',
        destination: '/sw.js'
      }
    ];
  },

  // Gestion des redirections
  async redirects() {
    return [];
  },

  // Configuration webpack pour optimiser le bundle
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Optimisations côté client pour PWA
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false
      };
    }
    return config;
  },

  // Images optimisées
  images: {
    domains: [],
    formats: ['image/webp', 'image/avif']
  },

  // Compression
  compress: true,

  // Mode production optimisé
  swcMinify: true,

  // Support PWA
  async generateBuildId() {
    // Générer un ID de build unique pour le cache busting
    return `pwa-${Date.now()}`;
  }
};

module.exports = nextConfig; 