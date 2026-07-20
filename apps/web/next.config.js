/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@gestionale/db", "@gestionale/types", "@gestionale/utils"],
  experimental: {
    // Binari nativi/wasm: webpack non deve provare a bundlarli, vanno risolti
    // a runtime come dipendenze Node normali (usati da documento-reader.ts
    // per l'OCR delle scansioni Presenza).
    serverComponentsExternalPackages: ["@napi-rs/canvas", "tesseract.js", "pdfjs-dist"],
  },
  images: {
    domains: ["localhost"],
  },
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
};

module.exports = nextConfig;
