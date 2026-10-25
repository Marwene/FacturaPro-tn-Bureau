/**
 * Garde d'upload : validation des fichiers reçus par les routes API.
 *
 * Principes :
 * - la taille est vérifiée AVANT de bufferiser le fichier (pas de lecture
 *   d'un fichier géant en mémoire) ;
 * - le type réel est sniffé sur les octets (magic bytes) : jamais déduit du
 *   nom de fichier, jamais de `file.type` seul (déclaratif, contrôlé par le
 *   client) — SVG/HTML sont ainsi rejetés (XSS stocké sur `/uploads` public) ;
 * - l'extension écrite sur disque est dérivée du MIME détecté.
 *
 * Aucune dépendance npm : sniffing maison, typé en unions littérales.
 */

import path from "path";

export type UploadCategory = "image" | "pdf";

export type DetectedMime =
  | "image/jpeg"
  | "image/png"
  | "image/webp"
  | "image/gif"
  | "application/pdf";

export const UPLOAD_LIMITS = {
  /** Logo société — cohérent avec `app/actions/companies.ts` (2 Mo). */
  logo: 2 * 1024 * 1024,
  /** Photo produit (5 Mo, inchangé). */
  productPhoto: 5 * 1024 * 1024,
  /** Fiche technique PDF (15 Mo, inchangé). */
  fiche: 15 * 1024 * 1024,
} as const;

const MIME_TO_EXT: Record<DetectedMime, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/pdf": "pdf",
};

/** Whitelist par usage : SVG/HTML ne figurent jamais dedans. */
const CATEGORY_ALLOWED: Record<UploadCategory, readonly DetectedMime[]> = {
  image: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  pdf: ["application/pdf"],
};

const CATEGORY_FORMAT_ERROR: Record<UploadCategory, string> = {
  image: "Format non supporté (JPEG, PNG, WebP, GIF)",
  pdf: "Seuls les fichiers PDF sont acceptés",
};

const JPEG_MAGIC = [0xff, 0xd8, 0xff];
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const GIF87A_MAGIC = [0x47, 0x49, 0x46, 0x38, 0x37, 0x61]; // "GIF87a" (6 octets exacts)
const GIF89A_MAGIC = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]; // "GIF89a" (6 octets exacts)
const RIFF_MAGIC = [0x52, 0x49, 0x46, 0x46]; // "RIFF"
const WEBP_MAGIC = [0x57, 0x45, 0x42, 0x50]; // "WEBP" à offset 8
const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46, 0x2d]; // "%PDF-"
const PDF_SEARCH_WINDOW = 1024;

const SAFE_UPLOAD_ID = /^[A-Za-z0-9_-]{1,64}$/;

function matchesAt(bytes: Uint8Array, signature: readonly number[], offset = 0): boolean {
  if (bytes.length < offset + signature.length) return false;
  for (let i = 0; i < signature.length; i += 1) {
    if (bytes[offset + i] !== signature[i]) return false;
  }
  return true;
}

function matchesWithin(
  bytes: Uint8Array,
  signature: readonly number[],
  windowSize: number
): boolean {
  const lastOffset = Math.min(bytes.length, windowSize) - signature.length;
  for (let offset = 0; offset <= lastOffset; offset += 1) {
    if (matchesAt(bytes, signature, offset)) return true;
  }
  return false;
}

/**
 * Détecte le type réel du fichier à partir de ses octets.
 * Retourne `null` si la signature n'est pas reconnue (HTML, XML, SVG, etc.).
 */
export function detectMime(bytes: Uint8Array): DetectedMime | null {
  if (matchesAt(bytes, JPEG_MAGIC)) return "image/jpeg";
  if (matchesAt(bytes, PNG_MAGIC)) return "image/png";
  if (matchesAt(bytes, GIF87A_MAGIC) || matchesAt(bytes, GIF89A_MAGIC)) return "image/gif";
  if (matchesAt(bytes, RIFF_MAGIC) && matchesAt(bytes, WEBP_MAGIC, 8)) return "image/webp";
  if (matchesWithin(bytes, PDF_MAGIC, PDF_SEARCH_WINDOW)) return "application/pdf";
  return null;
}

export type UploadValidation =
  | { ok: true; mime: DetectedMime; ext: string; bytes: Uint8Array }
  | { ok: false; message: string };

function normalizeDeclaredType(declaredType: string): string {
  return declaredType === "image/jpg" ? "image/jpeg" : declaredType;
}

/**
 * Valide un fichier d'upload : présence, taille, MIME déclaré (échec rapide)
 * puis contenu réel (magic bytes) — dans cet ordre, la taille étant contrôlée
 * avant toute lecture du contenu.
 *
 * En cas de succès, retourne les octets **déjà lus** (`bytes`) : les routes
 * écrivent ceux-là au disque sans seconde `file.arrayBuffer()` — on évite
 * ainsi la double bufferisation et tout écart entre les octets validés et les
 * octets écrits (TOCTOU).
 */
export async function validateUpload(
  file: File | null | undefined,
  options: { category: UploadCategory; maxBytes: number }
): Promise<UploadValidation> {
  if (!file || file.size === 0) {
    return { ok: false, message: "Fichier requis" };
  }

  if (file.size > options.maxBytes) {
    const maxMo = Math.round(options.maxBytes / (1024 * 1024));
    return { ok: false, message: `Fichier trop volumineux (max ${maxMo} Mo)` };
  }

  const allowed: readonly string[] = CATEGORY_ALLOWED[options.category];

  const declared = file.type.trim().toLowerCase();
  if (declared && !allowed.includes(normalizeDeclaredType(declared))) {
    return { ok: false, message: CATEGORY_FORMAT_ERROR[options.category] };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const detected = detectMime(bytes);
  if (!detected || !allowed.includes(detected)) {
    return { ok: false, message: "Contenu du fichier non conforme à son type" };
  }

  return { ok: true, mime: detected, ext: MIME_TO_EXT[detected], bytes };
}

/**
 * Identifiant de dossier d'upload sûr (`[A-Za-z0-9_-]{1,64}`) : à contrôler
 * avant tout `path.join` avec un `[id]` de route (défense en profondeur
 * anti-traversal, même si l'id est déjà validé par Prisma).
 */
export function isSafeUploadId(id: string): boolean {
  return SAFE_UPLOAD_ID.test(id);
}

/**
 * Résout une URL publique stockée en base (`photoUrl`, `ficheTechniqueUrl`)
 * vers un chemin absolu **contenu dans `public/`**, pour un `unlink`
 * best-effort sûr.
 *
 * Ces URL viennent de la DB et sont écrites tel quel par `PUT /api/products/[id]`
 * (`z.string()` sans format) : un utilisateur `produits:modifier` peut y placer
 * `../../../.env`. D'où ce garde ANTERIEUR à toute suppression.
 *
 * Retourne `null` (→ ne pas appeler `unlink`) si :
 * - l'URL ne commence pas par `/uploads/` (hors périmètre des uploads), ou
 * - la résolution sort de `public/` (traversal `..`, symlink-like via
 *   normalisation, ou préfixe trompeur : `public2` ne doit PAS passer →
 *   comparaison avec `path.sep` en suffixe).
 *
 * Retourne l'absolu normalisé sinon.
 */
export function resolvePublicFilePath(publicUrl: string): string | null {
  if (!publicUrl.startsWith("/uploads/")) return null;

  const publicRoot = path.join(process.cwd(), "public");
  // `"." + url` force l'interprétation relative de `/uploads/...`
  // (sans cela, `path.resolve` partirait de la racine du filesystem).
  const abs = path.resolve(process.cwd(), "public", `.${publicUrl}`);

  if (abs !== publicRoot && !abs.startsWith(`${publicRoot}${path.sep}`)) {
    return null;
  }
  return abs;
}
