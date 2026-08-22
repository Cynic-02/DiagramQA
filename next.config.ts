import type { NextConfig } from "next";

/**
 * Applied to every route. Deliberately does NOT include a
 * Content-Security-Policy: next-auth, Google Fonts and the inline theme
 * script all need one, and a wrong CSP fails closed (blank page) rather
 * than degrading. Add it as a follow-up behind a staging deploy.
 */
const securityHeaders = [
  // Stop MIME sniffing turning an upload into an executable response.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Clickjacking: nothing here is designed to be framed.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Diagram upload needs none of these.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  // Only honoured over HTTPS; ignored on localhost.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  output: "standalone",

  // Don't advertise the framework/version to scanners.
  poweredByHeader: false,

  typescript: {
    // Was `true`, which hid 18 real errors (including a missing Loader2
    // import that crashed the extraction editor on save). Keep it false so
    // a broken build fails in CI instead of at a user.
    ignoreBuildErrors: false,
  },

  reactStrictMode: false,

  compiler: {
    // Strip debug logging from production bundles, but keep error/warn so
    // real failures still surface in the browser console.
    removeConsole:
      process.env.NODE_ENV === "production"
        ? { exclude: ["error", "warn"] }
        : false,
  },

  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
