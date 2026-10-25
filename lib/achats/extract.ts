import { prisma } from "@/lib/prisma";
import { ServiceError } from "@/lib/service-error";
import { matchProductId } from "@/lib/bon-commande/matching";
import { getApiKey } from "@/lib/api-keys";

/**
 * Extraction OCR d'une **facture / BL fournisseur** (module Achats) — service
 * partagé (lot H) entre `POST /api/achats/extract` et `extractAchatFromScan`
 * (`app/actions/achats.ts`).
 *
 * `companyId` n'est qu'un **booléen de garde** (`companyId ? findMany : []`),
 * exactement comme `getCompanyId(request, session)` du handler d'origine.
 * Le matching produit passe par `lib/bon-commande/matching.ts` (source unique :
 * implémentation strictement identique à la copie locale qui existait ici).
 */

const SYSTEM_PROMPT = `Tu es un expert en extraction de données de factures fournisseurs tunisiennes.

Extrais les informations de cette facture au format JSON. Réponds UNIQUEMENT avec le JSON, sans texte avant ni après.

Règles:
- Les montants sont en TND (dinar tunisien) sauf indication contraire
- Les dates au format YYYY-MM-DD
- Le matricule fiscal est souvent au format "1234567X/A/M/000"
- Si un champ n'est pas trouvé, mets null
- Le timbre fiscal est le montant du timbre (ex: 1, 2, 3 TND) s'il figure sur la facture, sinon null
- Pour les lignes, extrait chaque article avec sa description, quantité, prix unitaire, remise éventuelle et taux TVA

Format JSON attendu:
{
  "fournisseur": {
    "raisonSociale": "string",
    "matriculeFiscal": "string | null",
    "adresse": "string | null",
    "ville": "string | null",
    "telephone": "string | null",
    "email": "string | null"
  },
  "referenceFournisseur": "string | null",
  "dateFacture": "string (YYYY-MM-DD) | null",
  "dateEcheance": "string (YYYY-MM-DD) | null",
  "notes": "string | null",
  "lines": [
    {
      "description": "string",
      "quantite": number,
      "prixAchat": number,
      "remise": number (0-100, défaut 0),
      "tauxTVA": number (0, 7, 13, 19, défaut 19)
    }
  ],
  "totalHT": number | null,
  "totalTVA": number | null,
  "totalTTC": number | null,
  "timbreFiscal": number | null
}`;

const OCR_JSON_SCHEMA = {
  type: "object",
  properties: {
    fournisseur: {
      type: "object",
      properties: {
        raisonSociale: { type: "string" },
        matriculeFiscal: { type: ["string", "null"] },
        adresse: { type: ["string", "null"] },
        ville: { type: ["string", "null"] },
        telephone: { type: ["string", "null"] },
        email: { type: ["string", "null"] },
      },
      required: ["raisonSociale", "matriculeFiscal", "adresse", "ville", "telephone", "email"],
      additionalProperties: false,
    },
    referenceFournisseur: { type: ["string", "null"] },
    dateFacture: { type: ["string", "null"] },
    dateEcheance: { type: ["string", "null"] },
    notes: { type: ["string", "null"] },
    lines: {
      type: "array",
      items: {
        type: "object",
        properties: {
          description: { type: "string" },
          quantite: { type: "number" },
          prixAchat: { type: "number" },
          remise: { type: "number" },
          tauxTVA: { type: "number" },
        },
        required: ["description", "quantite", "prixAchat", "remise", "tauxTVA"],
        additionalProperties: false,
      },
    },
    totalHT: { type: ["number", "null"] },
    totalTVA: { type: ["number", "null"] },
    totalTTC: { type: ["number", "null"] },
    timbreFiscal: { type: ["number", "null"] },
  },
  required: [
    "fournisseur",
    "referenceFournisseur",
    "dateFacture",
    "dateEcheance",
    "notes",
    "lines",
    "totalHT",
    "totalTVA",
    "totalTTC",
    "timbreFiscal",
  ],
  additionalProperties: false,
} as const;

type ExtractContext = { file: Buffer; fileName: string; docType: "BL" | "FACTURE" };

type ExtractFn = (
  base64Image: string,
  mimeType: string,
  apiKey: string,
  ctx: ExtractContext
) => Promise<Record<string, unknown>>;

function buildOcrPrompt(docType: "BL" | "FACTURE"): string {
  const typeInstruction =
    docType === "BL"
      ? "C'est un Bon de Livraison fournisseur : extrais la date de livraison dans dateFacture (sinon null), la référence fournisseur du BL, et les lignes d'articles livrés."
      : "C'est une facture fournisseur : extrais dateFacture, dateEcheance, et les lignes facturées.";
  return `${SYSTEM_PROMPT}\n\n${typeInstruction}`;
}

async function extractWithOpenAI(base64Image: string, mimeType: string, apiKey: string) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extrais les données de cette facture fournisseur au format JSON.",
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      max_tokens: 4096,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${err}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenAI returned empty response");

  return JSON.parse(content);
}

async function extractWithGemini(base64Image: string, mimeType: string, apiKey: string) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: SYSTEM_PROMPT + "\n\nExtrais les données de cette facture fournisseur au format JSON. Réponds UNIQUEMENT avec le JSON." },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64Image,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 4096,
        },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error: ${response.status} ${err}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned empty response");

  // Gemini may wrap JSON in markdown
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const jsonStr = jsonMatch ? jsonMatch[1] : text;
  return JSON.parse(jsonStr);
}

async function extractWithMistral(base64Image: string, mimeType: string, apiKey: string) {
  const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "pixtral-large-latest",
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Extrais les données de cette facture fournisseur au format JSON." },
            { type: "image_url", image_url: `data:${mimeType};base64,${base64Image}` },
          ],
        },
      ],
      max_tokens: 4096,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Mistral API error: ${response.status} ${err}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Mistral returned empty response");

  return JSON.parse(content);
}

async function extractWithMistralOCR(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  apiKey: string,
  docType: "BL" | "FACTURE"
): Promise<Record<string, unknown>> {
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
          name: "achat_extract",
          strict: true,
          schema: OCR_JSON_SCHEMA,
        },
      },
      document_annotation_prompt: buildOcrPrompt(docType),
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

export async function extractAchatScan(
  formData: FormData,
  companyId: string | null
): Promise<Record<string, unknown>> {
  const file = formData.get("file") as File | null;

  if (!file) throw ServiceError.response(400, "Fichier requis");

  const maxSize = 20 * 1024 * 1024;
  if (file.size > maxSize) {
    throw ServiceError.response(400, "Fichier trop volumineux (max 20 Mo)");
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
          : ext === "jpg" || ext === "jpeg"
            ? "image/jpeg"
            : "application/pdf");
  const buffer = Buffer.from(await file.arrayBuffer());
  const base64Image = buffer.toString("base64");
  const docType: "BL" | "FACTURE" = formData.get("type") === "BL" ? "BL" : "FACTURE";

  // Fetch API keys (env vars > DB fallback)
  const [openaiKey, geminiKey, mistralKey] = await Promise.all([
    getApiKey("openai"),
    getApiKey("gemini"),
    getApiKey("mistral"),
  ]);

  if (!openaiKey && !geminiKey && !mistralKey) {
    throw ServiceError.response(
      400,
      "Aucune clé API configurée. Configurez OpenAI, Gemini ou Mistral dans Paramètres > Général > IA."
    );
  }

  let result: Record<string, unknown> | undefined;
  const providers: { name: string; key: string | null | undefined; fn: ExtractFn }[] = [
    {
      name: "Mistral OCR",
      key: mistralKey,
      fn: (base64Image, mimeType, apiKey, ctx) =>
        extractWithMistralOCR(ctx.file, ctx.fileName, mimeType, apiKey, ctx.docType),
    },
    { name: "OpenAI", key: openaiKey, fn: extractWithOpenAI },
    { name: "Gemini", key: geminiKey, fn: extractWithGemini },
    { name: "Mistral", key: mistralKey, fn: extractWithMistral },
  ];

  let lastError: Error | null = null;

  for (const provider of providers) {
    if (!provider.key) continue;
    try {
      result = await provider.fn(base64Image, mimeType, provider.key, { file: buffer, fileName: file.name, docType });
      lastError = null;
      break;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[achats/extract] ${provider.name} failed:`, lastError.message);
      continue;
    }
  }

  if (!result || lastError) {
    throw ServiceError.response(
      500,
      `Tous les fournisseurs IA ont échoué. Dernière erreur : ${lastError?.message}${
        file.name.toLowerCase().endsWith(".pdf")
          ? " (les providers vision ne traitent que les images ; seul Mistral OCR gère les PDF)"
          : ""
      }`
    );
  }

  const r = result as Record<string, unknown>;
  const fournisseur = (r.fournisseur ?? {}) as Record<string, unknown>;
  const lines = (r.lines ?? []) as Array<Record<string, unknown>>;

  const products = companyId
    ? await prisma.product.findMany({
        where: { actif: true },
        select: { id: true, code: true, nom: true, codeBarre: true },
      })
    : [];

  // Validate and normalize the result
  const extracted = {
    fournisseur: {
      raisonSociale: (fournisseur.raisonSociale as string | undefined) ?? undefined,
      matriculeFiscal: (fournisseur.matriculeFiscal as string | undefined) ?? undefined,
      adresse: (fournisseur.adresse as string | undefined) ?? undefined,
      ville: (fournisseur.ville as string | undefined) ?? undefined,
      telephone: (fournisseur.telephone as string | undefined) ?? undefined,
      email: (fournisseur.email as string | undefined) ?? undefined,
    },
    referenceFournisseur: (r.referenceFournisseur as string | undefined) ?? undefined,
    dateFacture: (r.dateFacture as string | undefined) ?? undefined,
    dateEcheance: (r.dateEcheance as string | undefined) ?? undefined,
    notes: (r.notes as string | undefined) ?? undefined,
    lines: lines.map((line: Record<string, unknown>) => ({
      description: String(line.description || ""),
      quantite: Number(line.quantite) || 1,
      prixAchat: Number(line.prixAchat) || 0,
      remise: Number(line.remise) || 0,
      tauxTVA: Number(line.tauxTVA) || 19,
      productId: matchProductId(String(line.description || ""), products),
    })),
    totalHT: r.totalHT != null ? Number(r.totalHT) : null,
    totalTVA: r.totalTVA != null ? Number(r.totalTVA) : null,
    totalTTC: r.totalTTC != null ? Number(r.totalTTC) : null,
    timbreFiscal: r.timbreFiscal != null ? Number(r.timbreFiscal) : null,
  };

  return { extracted };
}
