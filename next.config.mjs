import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const EMBED_ORIGINS = [
  "https://cartacorte.netlify.app",
  "https://www.cortedemanga.com",
  "https://cortedemanga.com",
];

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https: https://www.google-analytics.com https://www.googletagmanager.com",
      "connect-src 'self' https: wss://*.supabase.co",
      "frame-src https://calendar.google.com https://www.google.com https://maps.google.com https://bid.g.doubleclick.net",
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

// Headers para la ruta /embed — permite framing desde los orígenes autorizados
// X-Frame-Options omitido: frame-ancestors en CSP es el mecanismo correcto para multi-origen
const embedHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https: https://www.google-analytics.com https://www.googletagmanager.com",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://www.google-analytics.com https://analytics.google.com https://googleads.g.doubleclick.net https://www.googletagmanager.com https://www.googleadservices.com https://www.google.com https://stats.g.doubleclick.net",
      "frame-src https://calendar.google.com https://www.google.com https://maps.google.com https://bid.g.doubleclick.net",
      `frame-ancestors 'self' ${EMBED_ORIGINS.join(" ")}`,
    ].join("; "),
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      // La regla más específica va después y sobreescribe los headers conflictivos
      {
        source: "/:locale/embed",
        headers: embedHeaders,
      },
    ];
  },
};

export default withNextIntl(nextConfig);

