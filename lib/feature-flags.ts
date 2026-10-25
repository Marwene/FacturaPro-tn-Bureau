/**
 * Feature flags pour l'application FacturaPro-TN
 *
 * Utilisation :
 *   import { FEATURE_FLAGS } from "@/lib/feature-flags";
 *   if (FEATURE_FLAGS.SHOW_SUPPLIERS_LISTING) { ... }
 *
 * Rollback : changer la valeur à false et redéployer
 */

export const FEATURE_FLAGS = {
  /** Afficher les colonnes multi-fournisseurs dans le listing produits */
  SHOW_SUPPLIERS_LISTING: true,
} as const;
