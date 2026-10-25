/**
 * C2 (correctif QA) — Source unique de validation des `callbackUrl`
 * (protection open-redirect). Remplace les 3 copies défaillantes de
 * `safeInternalPath` qui existaient dans `proxy.ts`,
 * `app/(auth)/login/login-action.ts` et `app/(auth)/login/page.tsx`.
 *
 * POURQUOI UN TEST DE CHAÎNE EST INSUFFISANT
 * ------------------------------------------
 * L'implémentation précédente testait la forme de la chaîne :
 * `raw.startsWith("/") && !raw.startsWith("//")`. Ce test est CONTOURNABLE
 * car le parseur d'URL du WHATWG (navigateur ET `new URL`) normalise
 * certains caractères en séparateur d'autorité :
 *   - `/\evil.com` (backslash U+005C) : le `\` est traité comme `/` pour les
 *     schémas spéciaux → résolu `https://evil.com/` — le test de chaîne le
 *     LAISSE PASSER (la chaîne ne commence pas par `//`).
 *   - `/<TAB>/evil.com` (tabulation U+0009) : la tabulation est supprimée par
 *     le parseur avant normalisation → même résultat, `https://evil.com/` —
 *     aussi laissé passé.
 * Vecteurs exploités sur `/login?callbackUrl=/\evil.com` et `/register`
 * (utilisateur déjà authentifié) → `Location: https://evil.com/`
 * (phishing post-login).
 *
 * CONTRE-MESURE (implémentation actuelle)
 * ---------------------------------------
 * Ne jamais se fier à la forme de la chaîne : on **résout** l'entrée contre
 * une origine interne factice non routable, puis on **compare les origines**.
 * Toute valeur qui résout hors de cette origine — scheme-relatif `//evil.com`,
 * absolu `https://evil.com`, `javascript:alert(1)`, URL illisible (throw) —
 * est refusée (`null`), et l'appelant applique son repli
 * (`DEFAULT_POST_LOGIN_ROUTE` — voir ci-dessous).
 *
 * Le retour est **reconstruit** depuis `pathname + search + hash` (jamais
 * depuis la chaîne brute) : c'est toujours un chemin relatif interne, sûr à
 * placer dans un en-tête `Location` ou dans un `redirect()` Next.
 *
 * Le `hash` est conservé : une ancre du type `/factures#ligne-12` est
 * inoffensive (le fragment n'est jamais transmis au serveur et ne modifie
 * pas l'origine), et la conserver aligne le comportement sur l'ancienne
 * implémentation qui repassait la chaîne brute.
 */

/**
 * Repli post-authentification — **source unique**.
 *
 * Employé par les 3 appelants de `safeInternalPath` (`proxy.ts`,
 * `app/(auth)/login/login-action.ts`, `app/(auth)/login/page.tsx`) quand le
 * `callbackUrl` est absent, vide, ou refusé comme open-redirect.
 *
 * POURQUOI LA RACINE ET NON L'ANCIEN LITTÉRAL `/dashboard`
 * ----------------------------------------------------------
 * La route `/dashboard` n'existe pas : le tableau de bord est servi à la
 * racine (`app/(app)/page.tsx`). L'ancien littéral (un chemin relatif vers
 * cette route fantôme) envoyait donc tout `callbackUrl` absent/invalidé sur un
 * **404 « Page introuvable »** juste après l'authentification (barre de
 * progression bloquée en fin de login). La racine est le chemin applicatif
 * garanti d'exister.
 */
export const DEFAULT_POST_LOGIN_ROUTE = "/";

/**
 * Origine de référence interne. Domaine factice (RFC 2606, suffixe
 * `.invalid` non routable) : aucun `callbackUrl` réel ne peut lui correspondre
 * par accident, seule une valeur résolvant en chemin/origine équivalente est
 * acceptée.
 */
const INTERNAL_BASE_URL = "https://facturapro-internal.invalid";

/** Origine de référence, pré-calculée (une seule construction à l'import). */
const INTERNAL_ORIGIN = new URL(INTERNAL_BASE_URL).origin;

/**
 * Restreint un `callbackUrl` à un chemin **interne**.
 *
 * @param raw Valeur brute du paramètre `callbackUrl` (ou équivalent) — sans
 *   aucune confiance : chaîne arbitraire venant de l'URL ou de l'appelant.
 * @returns Le chemin interne normalisé (`pathname + search + hash`) si la
 *   valeur résout sur l'origine interne ; `null` sinon (valeur absente, vide,
 *   illisible, ou résolvant vers une origine externe). Appelant → repli.
 */
export function safeInternalPath(raw: string | null | undefined): string | null {
    // Défense en profondeur : la signature est `string | null | undefined`, mais
    // une Server Action reçoit des arguments serialisés non vérifiés (ex. le
    // `callbackUrl` de `loginAction`, hors schéma Zod) — un appelant
    // malveillant peut transmettre un objet. `typeof` rejette tout non-string
    // (null, undefined, objet…) sans throw, contrairement à `raw.startsWith`.
    if (typeof raw !== "string") return null;
    // Espace(s) seul = vide une fois le parseur appliqué → refus explicite.
    if (raw.trim().length === 0) return null;

    let url: URL;
    try {
        // Résolution WHATWG : normalise `/\`, tabulations, etc. AVANT la
        // décision — c'est précisément ce que le test de chaîne ne faisait pas.
        url = new URL(raw, INTERNAL_BASE_URL);
    } catch {
        // URL illisible (ex. `http://[`) → refus par défaut, aucun log (entrée non fiable).
        return null;
    }

    // Compare les ORIGINES (schéma + hôte + port normalisés), pas la forme :
    // `//evil.com`, `/\evil.com`, `https://evil.com:80`, `javascript:…` → null.
    if (url.origin !== INTERNAL_ORIGIN) return null;

    // Reconstruction depuis l'objet parsé : la chaîne brute n'est jamais rejetée telle quelle.
    return `${url.pathname}${url.search}${url.hash}`;
}
