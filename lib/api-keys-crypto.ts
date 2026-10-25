// lib/api-keys-crypto.ts
// Chiffrement AES-256-GCM des clés API stockées en base — lot E3 (audit §3 S-5,
// exigence 7 du Prompt E). ZÉRO dépendance installée : `node:crypto` suffit.
//
// Format stocké — auto-descriptif et détectable sans ambiguïté :
//   enc:v1:<iv_b64>:<tag_b64>:<ct_b64>
//   - `enc:`  marqueur de chiffrement → détection par `isChiffre()` (préfixe
//     explicite, JAMAIS de devinette sur l'apparence de la valeur)
//   - `v1`    version du format : une valeur d'une version future n'est pas
//     interprétée à tort, elle est refusée à la lecture
//   - iv (12 o, GCM 96 bits), tag (16 o), ct → base64 standard séparés par `:`
//   L'authentification GCM (tag) détecte toute altération : déchiffrage corrompu
//   = exception, jamais une valeur fausse silencieuse.
//
// DÉRIVATION DE LA CLÉ (choix justifié, cf. ci-dessous) :
//   clé AES-256 = sha256(utf8(APP_KEYS_ENCRYPTION_KEY)) → 32 o exactement.
//   Pourquoi SHA-256 en une passe plutôt qu'un KDF (scrypt/PBKDF2/argon2) :
//   la valeur d'env est produite côté opérateur avec forte entropie machine
//   (sortie `openssl rand -base64 32`), ce n'est PAS un mot de passe faible à
//   ralentir — le travail d'un KDF n'apporterait rien ici. `node:crypto` couvre
//   AES-GCM nativement ; ajouter un KDF reviendrait à payer un coût de calcul
//   pour rien, sans dépendance installée possible (store pnpm corrompu, cf.
//   lib/logger.ts). La dérivation est déterministe : chaque processus retrouve
//   la même clé de déchiffrement sans état partagé.
//   La valeur de `APP_KEYS_ENCRYPTION_KEY` n'est JAMAIS journalisée, retournée
//   ou écrite dans un rapport — seul son nom d'variable apparaît.
//
// REPLI (décision utilisateur 2026-10-23, respectée à la lettre) :
//   `APP_KEYS_ENCRYPTION_KEY` absente → `chiffrer()` retourne la valeur telle
//   quelle (écriture en clair) + `logger.warn` structuré à CHAQUE écriture.
//   Aucun 500, aucune rupture en dev. `dechiffrer()` gère la fenêtre de
//   migration : valeur chiffrée (`enc:v1:`) → déchiffrée ; valeur en clair →
//   retournée telle quelle. Détecté par préfixe, jamais deviné.
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { logger } from "./logger";

/** Nom de la variable d'environnement portant la clé de chiffrement (jamais sa valeur). */
export const ENCRYPTION_ENV_VAR = "APP_KEYS_ENCRYPTION_KEY";

/** Préfixe du format v1 — toute valeur portant ce marqueur est chiffrée. */
export const CIPHER_PREFIX = "enc:v1:";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits d'IV (recommandation GCM) ; tag GCM = 16 o, clé = 32 o (sha256)

/** Clé AES dérivée de l'env, ou `null` si la variable est absente (repli en clair). */
function cleDerivee(): Buffer | null {
    const brut = process.env[ENCRYPTION_ENV_VAR];
    if (!brut) return null;
    // Justification (en-tête du fichier) : valeur d'env à haute entropie →
    // SHA-256 en une passe suffit, un KDF serait un coût sans bénéfice.
    return createHash("sha256").update(brut, "utf8").digest();
}

/** `true` si la valeur porte le marqueur `enc:v1:` (détection par préfixe explicite). */
export function isChiffre(valeur: string): boolean {
    return valeur.startsWith(CIPHER_PREFIX);
}

/**
 * Chiffre une clé en AES-256-GCM.
 * Repli documenté : env absente → valeur retournée en clair + `logger.warn`
 * à chaque écriture (le contexte ne contient JAMAIS la valeur de la clé).
 */
export function chiffrer(texte: string): string {
    const cle = cleDerivee();
    if (cle === null) {
        logger.warn(
            "[api-keys-crypto] APP_KEYS_ENCRYPTION_KEY absente — clé API écrite EN CLAIR (repli documenté lot E3)",
            { module: "api-keys-crypto", chiffrement: false },
        );
        return texte;
    }

    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, cle, iv);
    const chiffre = Buffer.concat([cipher.update(texte, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${CIPHER_PREFIX}${iv.toString("base64")}:${tag.toString("base64")}:${chiffre.toString("base64")}`;
}

/**
 * Déchiffre une valeur stockée — lecture rétro-compatible des deux états :
 *   - porte `enc:v1:` → déchiffre (échec d'authentification ou format/clef
 *     invalide → `Error` sans secret : l'appelant décide, jamais de valeur
 *     fausse retournée silencieusement) ;
 *   - aucun préfixe → valeur en clair (fenêtre de migration) retournée telle quelle.
 */
export function dechiffrer(valeur: string): string {
    if (!isChiffre(valeur)) {
        return valeur; // état « en clair » d'avant-migration : tel quel
    }
    const cle = cleDerivee();
    if (cle === null) {
        throw new Error("APP_KEYS_ENCRYPTION_KEY absente : valeur chiffrée illisible");
    }

    const [ivB64, tagB64, ctB64] = valeur.slice(CIPHER_PREFIX.length).split(":");
    if (!ivB64 || !tagB64 || !ctB64) {
        throw new Error("Format de valeur chiffrée invalide (enc:v1:<iv>:<tag>:<ct> attendu)");
    }

    try {
        const decipher = createDecipheriv(ALGORITHM, cle, Buffer.from(ivB64, "base64"));
        decipher.setAuthTag(Buffer.from(tagB64, "base64"));
        const clair = Buffer.concat([
            decipher.update(Buffer.from(ctB64, "base64")),
            decipher.final(),
        ]);
        return clair.toString("utf8");
    } catch {
        // Échec d'authentification GCM ou base64 corrompu : jamais de message
        // contenant des données — le message ne révèle ni la clé ni la valeur.
        throw new Error("Déchiffrement impossible (clé de chiffrement différente ou donnée altérée)");
    }
}

/** Préfixe des valeurs masquées renvoyées par GET (`••••…abcd`). */
const MASK_PREFIX = "••••";

/**
 * Garde-fou `••••` : une valeur masquée renvoyée par GET ne doit JAMAIS être
 * réécrite en base (sinon la vraie clé serait écrasée par le masque).
 */
export function estMasquee(valeur: string): boolean {
    return valeur.startsWith(MASK_PREFIX);
}

/**
 * Prépare une clé reçue du client pour l'écriture en base :
 *   - `undefined` → inchangé (« ne pas toucher à la colonne ») ;
 *   - `null`      → effacement explicite (colonne vidée) ;
 *   - masquée `••••…` → `undefined` : IGNORÉE, jamais écrite (garde-fou) ;
 *   - `""`        → `""` conservé tel quel (effacement = pas de clé) — non
 *     chiffré, sinon `hasApiKey` considérerait un chiffrement de chaîne vide
 *     comme une clé configurée ;
 *   - sinon → chiffrée AES-256-GCM si `APP_KEYS_ENCRYPTION_KEY` est posée,
 *     sinon repli en clair + `logger.warn` (voir `chiffrer`).
 */
export function preparerClePourStockage(
    valeur: string | null | undefined,
): string | null | undefined {
    if (valeur === undefined || valeur === null) return valeur;
    if (estMasquee(valeur)) return undefined; // garde-fou •••• : jamais écrite
    if (valeur === "") return valeur;
    return chiffrer(valeur);
}
