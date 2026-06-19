/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Static export so the app can be hosted anywhere and installed as a PWA.
  output: "export",
  images: { unoptimized: true },
};

export default nextConfig;
