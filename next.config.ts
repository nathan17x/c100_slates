import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // The parent folder has its own package.json; pin the project root here.
  outputFileTracingRoot: __dirname,
  turbopack: {
    root: __dirname,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  cacheComponents: true,
  partialPrefetching: true,
};

export default nextConfig;
