/** @type {import('next').NextConfig} */
const nextConfig = {
  // ============================================================
  // NO CACHING - Real-time data hamesha
  // ============================================================
  experimental: {
    staleTimes: {
      dynamic: 0,    // Dynamic routes - no cache
      static: 0,     // Static routes - no cache
    },
  },
};

module.exports = nextConfig;
