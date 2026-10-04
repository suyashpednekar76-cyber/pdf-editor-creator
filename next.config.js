/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  trailingSlash: true,

  // GitHub repository name
  basePath: "/pdf-editor-creator",

  images: {
    unoptimized: true,
  },

  reactStrictMode: true,

  webpack: (config) => {
    // Required for browser-based PDF processing
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
    };

    return config;
  },
};

module.exports = nextConfig;