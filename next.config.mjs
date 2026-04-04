/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {},
  serverExternalPackages: ['pdf-parse', '@napi-rs/canvas', 'pdfjs-dist'],
};

export default nextConfig;
