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
  // Nessun security header era configurato (trovato durante mini-audit
  // sicurezza 2026-07-21: zero CSP/X-Frame-Options/HSTS/ecc.). Aggiunti qui
  // perché sono globali per tutte le route, non solo le API — un singolo
  // punto invece di duplicarli endpoint per endpoint.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" }, // blocca clickjacking via iframe
          { key: "X-Content-Type-Options", value: "nosniff" }, // blocca MIME-sniffing
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          // HSTS: forza HTTPS ai browser che l'hanno già visto una volta.
          // Nessun impatto in dev (http://localhost) — i browser ignorano
          // Strict-Transport-Security su origin non-https.
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
