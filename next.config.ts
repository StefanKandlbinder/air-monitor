import type { NextConfig } from "next";
import path from "path";

const polyfillNoop = path.resolve("./lib/polyfill-noop.ts");

// Next.js ships a pre-compiled polyfill-module.js that polyfills Array.at,
// Object.hasOwn, flatMap, etc. These are Baseline features natively supported
// in all browsers since 2022. Replacing with an empty module saves ~13 KiB.
const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: {
    position: "bottom-right",
  },
  turbopack: {
    resolveAlias: {
      "next/dist/build/polyfills/polyfill-module": polyfillNoop,
    },
  },
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      "next/dist/build/polyfills/polyfill-module": polyfillNoop,
    };
    return config;
  },
};

export default nextConfig;
