/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow images from Weather-AI's overlay image CDN
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.weather-ai.co',
      },
    ],
  },
};

export default nextConfig;
