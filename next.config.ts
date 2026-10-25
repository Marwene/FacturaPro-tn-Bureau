import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compiler: {
    // Audit 2026-10 : en production, on retire seulement les logs de debug.
    // `error` et `warn` sont conservés (l'ancien `true` global les supprimait aussi).
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error", "warn"] } : false,
  },
  // Audit 2026-10 : le bloc `images.remotePatterns` (wildcard globale sur hostname)
  // a été SUPPRIMÉ : grep des hôtes (app/components/lib/public) ne révèle aucun
  // hôte distant servi via next/image — toutes les images sont locales (/uploads/...).
  // Si un jour un hôte distant est nécessaire, ajouter ici une liste EXPLICITE de
  // { protocol, hostname, pathname? }, jamais de wildcard globale.

  // Headers de sécurité globaux sur toutes les routes.
  // Aucune URL de connexion, aucun secret dans ce fichier.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
          // CSP en Report-Only D'ABORD : on observe les violations (onglet
          // Navigateur → Console/Network) sans casser l'app, puis on passera en
          // `Content-Security-Policy` (enforce) après vérification.
          // Pas de report-uri tant qu'aucun endpoint de rapport n'est configuré
          // (pas d'URL inventée ici).
          {
            key: "Content-Security-Policy-Report-Only",
            value:
              "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
