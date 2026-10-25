/**
 * Source unique des couleurs de sens flux (entrée / sortie) — lot D3.2.
 *
 * Les copies locales `entreeColor` / `sortieColor` de `tresorerie-recents` et
 * `tresorerie-ventilation`, et les strings inlinées de `tresorerie-echeances`,
 * `tresorerie-echeances-columns` et `tresorerie-projection`, passent par ces
 * exports : seule la source change, le rendu est identique. Le vert sert aussi
 * aux états positifs déjà alignés dessus (statut « Réalisé », toast « succès »).
 */
export const FLUX_ENTREE_COLOR = "text-emerald-600 dark:text-emerald-400"
export const FLUX_SORTIE_COLOR = "text-rose-600 dark:text-rose-400"
