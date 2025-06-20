
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true, // Explicitly set, though usually default true
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com', // Add Firebase Storage domain
        port: '',
        pathname: '/**', // You might want to restrict this to your bucket path e.g., /v0/b/your-bucket-name.appspot.com/o/**
      },
    ],
  },
};

export default nextConfig;
