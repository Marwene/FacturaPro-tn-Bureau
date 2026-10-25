import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Règle projet (AGENTS.md CODE RULES) : `any` interdit, portée par la config
    // et pas seulement par la discipline.
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  {
    // Audit 2026-10 — socle notifications : `sonner` n'est importable que par
    // le socle (`lib/notify.ts`) et par le <Toaster> (`components/ui/sonner.tsx`).
    // Migration complète (lots F.3a/F.3b) : la règle est en "error".
    ignores: ["lib/notify.ts", "components/ui/sonner.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "sonner",
              message: "Importer uniquement via le socle @/lib/notify (notify.success/error/warning/promise).",
            },
          ],
          patterns: [
            {
              group: ["sonner/*"],
              message: "Importer uniquement via le socle @/lib/notify (notify.success/error/warning/promise).",
            },
          ],
        },
      ],
    },
  },
  {
    // Audit 2026-10 — Prompt I (lot I0) : seuils de découpage des gros
    // composants. En "warn" uniquement : le passage en "error" viendra dans un
    // sous-lot ultérieur une fois la dette résorbée. Compteur brut (pas de
    // skipBlankLines / skipComments) pour rester cohérent avec les comptages
    // `wc -l` du prompt I.
    files: ["components/**/*.tsx"],
    rules: {
      "max-lines": ["warn", 250],
    },
  },
  {
    files: ["hooks/**/*.ts"],
    rules: {
      "max-lines": ["warn", 200],
    },
  },
  {
    files: ["app/**/page.tsx"],
    rules: {
      "max-lines": ["warn", 60],
    },
  },
  {
    files: ["app/api/**/route.ts"],
    rules: {
      "max-lines": ["warn", 200],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Audit 2026-10 : code généré + graphe de connaissance (pas du code projet).
    "prisma/generated/**",
    "graphify-out/**",
  ]),
]);

export default eslintConfig;
