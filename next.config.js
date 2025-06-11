/** @type {import('next').NextConfig} */
const nextConfig = {
  /* Ensure pages are properly served */
  useFileSystemPublicRoutes: true,

  /* Prefer Pages Router */
  reactStrictMode: true,

  eslint: {
    ignoreDuringBuilds: true, // ✅ Ignore ESLint errors during Netlify builds
  },
  typescript: {
    ignoreBuildErrors: true, // ✅ Ignore TypeScript errors during Netlify builds
  },
};

module.exports = nextConfig;
