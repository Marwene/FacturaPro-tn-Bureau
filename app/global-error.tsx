"use client";

/**
 * F.2 — Dernier recours : le layout racine a échoué, donc le CSS global et
 * les composants partagés peuvent être indisponibles. Fichier 100 % autonome
 * (styles + icône en dur, zéro import hors React/Next).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem",
          backgroundColor: "#ffffff",
          color: "#0f172a",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
          WebkitFontSmoothing: "antialiased",
        }}
      >
        <style>{`
          @media (prefers-color-scheme: dark) {
            body.fptn-crash { background-color: #0f172a; color: #e2e8f0; }
            .fptn-crash-muted { color: #94a3b8 !important; }
            .fptn-crash-ref { color: #64748b !important; }
            .fptn-crash-btn-secondary { border-color: #334155 !important; }
          }
        `}</style>
        <main
          className="fptn-crash"
          style={{
            maxWidth: "28rem",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "1rem",
            textAlign: "center",
          }}
        >
          <span
            aria-hidden
            style={{
              display: "flex",
              height: "2rem",
              width: "2rem",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "0.5rem",
              backgroundColor: "rgba(220, 38, 38, 0.1)",
              color: "#dc2626",
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
            </svg>
          </span>
          <h1 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 600 }}>
            Une erreur critique est survenue
          </h1>
          <p
            className="fptn-crash-muted"
            style={{ margin: 0, fontSize: "0.875rem", lineHeight: 1.6, color: "#64748b" }}
          >
            L&apos;application n&apos;a pas pu être chargée. Réessayez, ou
            rechargez la page si le problème persiste.
          </p>
          {error.digest && (
            <p
              className="fptn-crash-ref"
              style={{ margin: 0, fontSize: "0.75rem", color: "#94a3b8" }}
            >
              Référence : {error.digest}
            </p>
          )}
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              onClick={reset}
              style={{
                height: "2.25rem",
                padding: "0 1rem",
                borderRadius: "0.5rem",
                border: "1px solid transparent",
                backgroundColor: "#0f172a",
                color: "#ffffff",
                fontSize: "0.875rem",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Réessayer
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="fptn-crash-btn-secondary"
              style={{
                height: "2.25rem",
                padding: "0 1rem",
                borderRadius: "0.5rem",
                border: "1px solid #e2e8f0",
                backgroundColor: "transparent",
                color: "inherit",
                fontSize: "0.875rem",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Recharger la page
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
