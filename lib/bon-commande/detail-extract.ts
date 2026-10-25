import { prisma } from "@/lib/prisma";
import { ServiceError } from "@/lib/service-error";
import { matchProductId } from "@/lib/bon-commande/matching";
import { getApiKey } from "@/lib/api-keys";

/**
 * Extraction OCR du bon de commande **détaillé** (confection textile) — service
 * partagé (lot H) entre `POST /api/bons-commande/[id]/detail/extract` et
 * `extractBonCommandeDetailFromScan` (`app/actions/bons-commande.ts`).
 *
 * `readFormData` est une **lecture différée du corps** : elle n'est invoquée
 * qu'APRÈS le garde-fous d'existence 404 ci-dessous — l'ordre exact de
 * l'ancien handler (`findFirst` → 404 → `await request.formData()`), imposé
 * par le finding W2 de la revue QA du lot H (BC inexistante + corps malformé
 * doit répondre **404**, pas 500). La route passe `() => request.formData()`,
 * la server action `async () => formData` (déjà constituée : lecture immédiate).
 */

const SYSTEM_PROMPT = `Tu es un expert en extraction de données de bons de commande détaillés (confection textile) tunisiens.

Ce document détaille, pour un ou plusieurs articles, la répartition par taille, couleur, broderie et impression DTF. Extrais chaque ligne de détail au format JSON. Réponds UNIQUEMENT avec le JSON, sans texte avant ni après.

Règles:
- "codeArticle" est le code produit s'il est présent sur le document (ex: CNS00062), sinon null
- "description" est le nom de l'article tel qu'écrit sur le document (ex: "POLO GRIS BKFI")
- "taille", "couleur", "broderie", "impressionDtf" : la valeur telle qu'écrite, ou null si non applicable/absente
- "quantite" est la quantité pour cette combinaison précise (une ligne par taille/couleur/broderie/DTF, pas de total)
- Si un champ n'est pas trouvé, mets null

Format JSON attendu:
{
  "lines": [
    {
      "codeArticle": "string | null",
      "description": "string",
      "taille": "string | null",
      "couleur": "string | null",
      "broderie": "string | null",
      "impressionDtf": "string | null",
      "quantite": number
    }
  ]
}`;

const DETAIL_OCR_JSON_SCHEMA = {
    type: "object",
    properties: {
        lines: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    codeArticle: { type: ["string", "null"] },
                    description: { type: "string" },
                    taille: { type: ["string", "null"] },
                    couleur: { type: ["string", "null"] },
                    broderie: { type: ["string", "null"] },
                    impressionDtf: { type: ["string", "null"] },
                    quantite: { type: "number" },
                },
                required: ["codeArticle", "description", "taille", "couleur", "broderie", "impressionDtf", "quantite"],
                additionalProperties: false,
            },
        },
    },
    required: ["lines"],
    additionalProperties: false,
} as const;

async function extractWithMistralOCR(fileBuffer: Buffer, mimeType: string, apiKey: string): Promise<Record<string, unknown>> {
    const response = await fetch("https://api.mistral.ai/v1/ocr", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: "mistral-ocr-3-0",
            document: {
                type: "document_url",
                document_url: `data:${mimeType};base64,${fileBuffer.toString("base64")}`,
            },
            table_format: "html",
            document_annotation_format: {
                type: "json_schema",
                json_schema: {
                    name: "bc_detail_extract",
                    strict: true,
                    schema: DETAIL_OCR_JSON_SCHEMA,
                },
            },
            document_annotation_prompt: SYSTEM_PROMPT,
        }),
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Mistral OCR API error: ${response.status} ${err}`);
    }

    const data = await response.json();
    const raw = data.document_annotation;
    const parsed =
        typeof raw === "object" && raw?.json ? raw.json : typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!parsed) throw new Error("Mistral OCR returned empty response");
    return parsed as Record<string, unknown>;
}

export async function extractBonCommandeDetailScan(
    bonCommandeId: string,
    companyId: string,
    readFormData: () => Promise<FormData>
): Promise<Record<string, unknown>> {
    const bonCommande = await prisma.bonCommande.findFirst({
        where: { id: bonCommandeId, companyId },
        include: {
            lines: { include: { product: { select: { id: true, code: true, nom: true, codeBarre: true } } } },
        },
    });
    if (!bonCommande) throw ServiceError.response(404, "Bon de commande introuvable");

    const formData = await readFormData();
    const file = formData.get("file") as File | null;
    if (!file) throw ServiceError.response(400, "Fichier requis");

    const maxSize = 20 * 1024 * 1024;
    if (file.size > maxSize) {
        throw ServiceError.response(400, "Fichier trop volumineux (max 20 Mo)");
    }

    // Fetch Mistral API key (env var > DB fallback)
    const mistralKey = await getApiKey("mistral");
    if (!mistralKey) {
        throw ServiceError.response(
            400,
            "Clé Mistral non configurée. Configurez-la dans Paramètres > Général > IA (seul Mistral OCR gère les PDF)."
        );
    }

    const ext = file.name.split(".").pop()?.toLowerCase();
    const mimeType =
        file.type ||
        (ext === "pdf"
            ? "application/pdf"
            : ext === "png"
                ? "image/png"
                : ext === "webp"
                    ? "image/webp"
                    : "image/jpeg");
    const buffer = Buffer.from(await file.arrayBuffer());

    const result = await extractWithMistralOCR(buffer, mimeType, mistralKey);
    const rawLines = (result.lines ?? []) as Array<Record<string, unknown>>;

    // Pour le rapprochement produit -> ligne du BC, on matche sur le code
    // article/désignation par rapport aux produits déjà présents sur ce BC.
    const products = bonCommande.lines
        .filter((l) => l.product)
        .map((l) => ({
            id: l.product!.id,
            code: l.product!.code,
            nom: l.product!.nom,
            codeBarre: l.product!.codeBarre,
        }));

    const lignesParProduit = new Map(bonCommande.lines.map((l) => [l.productId, l]));

    const lines = rawLines.map((line, i) => {
        const rawCode = String(line.codeArticle || line.description || "");
        const productId = matchProductId(rawCode, products);
        const bonCommandeLine = productId ? lignesParProduit.get(productId) : undefined;

        return {
            id: crypto.randomUUID?.() ?? `${i}`,
            bonCommandeLineId: bonCommandeLine?.id ?? null,
            codeArticle: (line.codeArticle as string | null) ?? null,
            description: String(line.description || ""),
            taille: (line.taille as string | null) ?? null,
            couleur: (line.couleur as string | null) ?? null,
            broderie: (line.broderie as string | null) ?? null,
            impressionDtf: (line.impressionDtf as string | null) ?? null,
            quantite: String(Number(line.quantite) || 0),
        };
    });

    const nonRapprochees = lines.filter((l) => !l.bonCommandeLineId).length;

    return {
        extracted: {
            lines,
            lignesDisponibles: bonCommande.lines.map((l) => ({
                id: l.id,
                description: l.description,
                quantite: l.quantite.toString(),
                codeProduit: l.product?.code ?? null,
            })),
            nonRapprochees,
        },
    };
}
