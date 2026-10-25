/**
 * Clés déterministes (`cleSource`) du grand livre de trésorerie — lot D2.
 *
 * Le format DOIT rester byte-à-byte identique à celui du backfill D1
 * (`prisma/backfill-mouvements-tresorerie.ts`) : `MouvementTresorerie.cleSource`
 * est `@unique`, donc toute divergence ferait échouer (ou pire, dupliquer)
 * une ré-exécution du backfill. Ce module est la SOURCE UNIQUE de vérité du
 * format — le backfill et le ledger live doivent l'importer.
 *
 * Module PUR : aucune dépendance base de données, aucun import Prisma.
 */

/** Suffixes autorisés — réservés aux écritures produites par le lot D2. */
export type SuffixeCleSource = "agios" | "contrepassation";

const SUFFIXES_AUTORISES: ReadonlySet<string> = new Set<string>(["agios", "contrepassation"]);

/**
 * Chaîne complète de suffixes acceptée par `analyserCleSource` : un seul
 * suffixe, ou la combinaison unique `:agios` puis `:contrepassation` — la
 * contre-passation d'une écriture d'agios produit `effet:<id>:agios:contrepassation`
 * (`ledger.ts` applique `cleSourceContrepassation` à la clé déjà suffixée en `:agios`).
 * L'ordre est SIGNIFICATIF : `contrepassation:agios` (ou tout autre couple,
 * répétition ou suffixe inconnu) reste rejeté.
 */
export type ChaineSuffixeCleSource = SuffixeCleSource | "agios:contrepassation";

const CHAINES_SUFFIXES_AUTORISEES: ReadonlyMap<string, ChaineSuffixeCleSource> = new Map<
    string,
    ChaineSuffixeCleSource
>([
    ["agios", "agios"],
    ["contrepassation", "contrepassation"],
    ["agios:contrepassation", "agios:contrepassation"],
]);

export function cleSourcePayment(paymentId: string): string {
    return `payment:${paymentId}`;
}

export function cleSourceCheque(chequeId: string): string {
    return `cheque:${chequeId}`;
}

export function cleSourceEffet(effetId: string): string {
    return `effet:${effetId}`;
}

export function cleSourceMouvementFinancier(mouvementFinancierId: string): string {
    return `mf:${mouvementFinancierId}`;
}

/** Applique un suffixe D2 (`:agios`, `:contrepassation`) à une clé de base. */
export function cleSourceAvecSuffixe(base: string, suffixe: SuffixeCleSource): string {
    if (!SUFFIXES_AUTORISES.has(suffixe)) {
        throw new Error(`Suffixe de clé de trésorerie non autorisé : ${suffixe}`);
    }
    return `${base}:${suffixe}`;
}

/** Clé de l'écriture d'agios/frais associée à une écriture de base. */
export function cleSourceAgios(base: string): string {
    return cleSourceAvecSuffixe(base, "agios");
}

/** Clé de l'écriture inverse (contre-passation) d'une écriture de base. */
export function cleSourceContrepassation(base: string): string {
    return cleSourceAvecSuffixe(base, "contrepassation");
}

export type TypeSourceCle = "payment" | "cheque" | "effet" | "mf";

/**
 * Découpe une clé en (type de source, identifiant, chaîne de suffixes éventuelle).
 * Accepte 0, 1 ou 2 suffixes — la seule chaîne de 2 autorisée étant
 * `:agios` puis `:contrepassation` (voir `ChaineSuffixeCleSource`).
 * Retourne `null` si la clé ne suit pas le format attendu (préfixe inconnu,
 * identifiant vide, suffixe inconnu, ordre ou répétition de suffixes invalides).
 */
export function analyserCleSource(
    cle: string,
): { type: TypeSourceCle; id: string; suffixe: ChaineSuffixeCleSource | null } | null {
    const [prefixe, reste, ...suffixes] = cle.split(":");
    if (reste === undefined || reste.length === 0) {
        return null;
    }
    const type: TypeSourceCle | null =
        prefixe === "payment" ? "payment"
            : prefixe === "cheque" ? "cheque"
                : prefixe === "effet" ? "effet"
                    : prefixe === "mf" ? "mf"
                        : null;
    if (type === null) {
        return null;
    }
    if (suffixes.length === 0) {
        return { type, id: reste, suffixe: null };
    }
    const suffixe = CHAINES_SUFFIXES_AUTORISEES.get(suffixes.join(":"));
    if (suffixe === undefined) {
        return null;
    }
    return { type, id: reste, suffixe };
}
