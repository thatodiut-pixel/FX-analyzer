/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactCompiler: true,
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';
    return [
      {
        source: '/api/backend/:path*',
        destination: `${backendUrl}/api/:path*`
      }
    ]
  },
  // Required for Three.js to work with Vercel
  transpilePackages: ['three'],
};

export default nextConfig;
