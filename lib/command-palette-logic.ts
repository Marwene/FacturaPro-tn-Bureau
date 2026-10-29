import type { SearchGroup } from "./search";

/**
 * Logique pure de la palette de commandes (`components/command-palette.tsx`) :
 * détection du module courant depuis l'URL, réconciliation du module
 * sélectionné avec les groupes reçus, et index de navigation clavier ↑/↓.
 * Sans React ni I/O — extraite du composant pour rester testable
 * (convention `lib/*-logic.ts` + `lib/__tests__/*-logic.test.ts`).
 */

export const PATH_MODULE_MAP: Record<string, string> = {
  clients: "clients",
  fournisseurs: "fournisseurs",
  produits: "produits",
  factures: "factures",
  devis: "devis",
  "bons-commande": "bons-commande",
  "bons-livraison": "bons-livraison",
  avoirs: "avoirs",
  achats: "achats",
  paiements: "paiements",
  cheques: "cheques",
  exports: "exports",
  rapports: "rapports",
  inventaire: "inventaire",
  "stock-mouvements": "stock-mouvements",
};

export function detectModule(pathname: string): string | null {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return null;
  return PATH_MODULE_MAP[segments[0] as keyof typeof PATH_MODULE_MAP] ?? null;
}

/**
 * Module sélectionné cohérent avec les groupes reçus — les 3 branches de
 * l'ajustement au rendu d'origine :
 * - aucun groupe → aucun module ;
 * - module absent (ou null) → premier module des résultats ;
 * - sinon → module conservé.
 */
export function reconcileSelectedModule(groups: SearchGroup[], selectedModule: string | null): string | null {
  if (groups.length === 0) return null;
  if (!selectedModule || !groups.some((gr) => gr.module === selectedModule)) return groups[0].module;
  return selectedModule;
}

/**
 * Index suivant pour ↑/↓ dans le module sélectionné — `null` = touche non
 * gérée (l'appelant n'applique alors aucun `preventDefault`).
 */
export function nextNavIndex(key: string, index: number, max: number): number | null {
  if (key === "ArrowDown") return index < max ? index + 1 : 0;
  if (key === "ArrowUp") return index > 0 ? index - 1 : max;
  return null;
}
