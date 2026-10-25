import { prisma } from "@/lib/prisma";
import { ServiceError } from "@/lib/service-error";
import { matchProductId } from "@/lib/bon-commande/matching";
import { getApiKey } from "@/lib/api-keys";

/**
 * Extraction OCR d'un **bon de commande** — service partagé (lot H) entre
 * `POST /api/bons-commande/extract` et `extractBonCommandeFromScan`
 * (`app/actions/bons-commande.ts`).
 *
 * `companyId` n'est qu'un **booléen de garde** (`companyId ? findMany : []`),
 * exactement comme `getCompanyId(request, session)` du handler d'origine : un
 * utilisateur sans société garde un matching produit vide, jamais un 403.
 */

const SYSTEM_PROMPT = `Tu es un expert en extraction de données de bons de commande clients tunisiens.

Extrais les informations de ce bon de commande au format JSON. Réponds UNIQUEMENT avec le JSON, sans texte avant ni après.

Règles:
- Les montants sont en TND (dinar tunisien) sauf indication contraire
- Les dates au format YYYY-MM-DD
- Le matricule fiscal est souvent au format "1234567X/A/M/000"
- Si un champ n'est pas trouvé, mets null
- Le client est celui qui émet le bon de commande
- Pour les lignes, extrait chaque article avec sa description, quantité, prix unitaire HT, taux TVA et si le FODEC s'applique
- Le FODEC (Fonds de Développement de la Compétitivité) s'applique aux produits de consommation courante (huile, sucre, produits alimentaires...), taux 1%

Format JSON attendu:
{
  "clientName": "string",
  "referenceBC": "string | null",
  "dateDocument": "string (YYYY-MM-DD) | null",
  "notes": "string | null",
  "lines": [
    {
      "description": "string",
      "quantite": number,
      "prixHT": number,
      "tauxTVA": number (0, 7, 13, 19, défaut 19),
      "fodec": boolean (défaut false)
    }
  ],
  "totalHT": number | null,
  "totalTVA": number | null,
  "totalTTC": number | null
}`;

const BC_OCR_JSON_SCHEMA = {
  type: "object",
  properties: {
    clientName: { type: "string" },
    referenceBC: { type: ["string", "null"] },
    dateDocument: { type: ["string", "null"] },
    notes: { type: ["string", "null"] },
    lines: {
      type: "array",
      items: {
        type: "object",
        properties: {
          description: { type: "string" },
          quantite: { type: "number" },
          prixHT: { type: "number" },
          tauxTVA: { type: "number" },
          fodec: { type: "boolean" },
        },
        required: ["description", "quantite", "prixHT", "tauxTVA", "fodec"],
        additionalProperties: false,
      },
    },
    totalHT: { type: ["number", "null"] },
    totalTVA: { type: ["number", "null"] },
    totalTTC: { type: ["number", "null"] },
  },
  required: [
    "clientName",
    "referenceBC",
    "dateDocument",
    "notes",
    "lines",
    "totalHT",
    "totalTVA",
    "totalTTC",
  ],
  additionalProperties: false,
} as const;

const OCR_PROMPT = `${SYSTEM_PROMPT}\n\nC'est un bon de commande émis par un client : extrais le nom du client émetteur, la référence du bon de commande, la date du document, et les lignes commandées.`;

type ExtractContext = { file: Buffer; fileName: string };

type ExtractFn = (
  base64Image: string,
  mimeType: string,
  apiKey: string,
  ctx: ExtractContext
) => Promise<Record<string, unknown>>;

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
              text: "Extrais les données de ce bon de commande client au format JSON.",
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
              { text: SYSTEM_PROMPT + "\n\nExtrais les données de ce bon de commande client au format JSON. Réponds UNIQUEMENT avec le JSON." },
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
            { type: "text", text: "Extrais les données de ce bon de commande client au format JSON." },
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
  apiKey: string
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
          name: "bc_extract",
          strict: true,
          schema: BC_OCR_JSON_SCHEMA,
        },
      },
      document_annotation_prompt: OCR_PROMPT,
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

export async function extractBonCommandeScan(
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
        extractWithMistralOCR(ctx.file, ctx.fileName, mimeType, apiKey),
    },
    { name: "OpenAI", key: openaiKey, fn: extractWithOpenAI },
    { name: "Gemini", key: geminiKey, fn: extractWithGemini },
    { name: "Mistral", key: mistralKey, fn: extractWithMistral },
  ];

  let lastError: Error | null = null;

  for (const provider of providers) {
    if (!provider.key) continue;
    try {
      result = await provider.fn(base64Image, mimeType, provider.key, { file: buffer, fileName: file.name });
      lastError = null;
      break;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[bons-commande/extract] ${provider.name} failed:`, lastError.message);
      continue;
    }
  }

  if (!result || lastError) {
    throw ServiceError.response(
      500,
      `Tous les fournisseurs IA ont échoué. Dernière erreur : ${lastError?.message}${file.name.toLowerCase().endsWith(".pdf")
        ? " (les providers vision ne traitent que les images ; seul Mistral OCR gère les PDF)"
        : ""
      }`
    );
  }

  const r = result as Record<string, unknown>;
  const lines = (r.lines ?? []) as Array<Record<string, unknown>>;

  const products = companyId
    ? await prisma.product.findMany({
      where: { actif: true },
      select: { id: true, code: true, nom: true, codeBarre: true },
    })
    : [];

  const extracted = {
    clientName: (r.clientName as string | undefined) ?? undefined,
    referenceBC: (r.referenceBC as string | undefined) ?? undefined,
    dateDocument: (r.dateDocument as string | undefined) ?? new Date().toISOString().split("T")[0],
    notes: (r.notes as string | undefined) ?? undefined,
    lines: lines.map((line: Record<string, unknown>, i: number) => ({
      id: crypto.randomUUID?.() ?? `${i}`,
      productId: matchProductId(String(line.description || ""), products),
      description: String(line.description || ""),
      quantite: String(Number(line.quantite) || 1),
      prixHT: String(Number(line.prixHT) || 0),
      remise: "0",
      tauxTVA: String(Number(line.tauxTVA) || 19),
      fodec: line.fodec === true,
      tauxFodec: "1",
      totalHT: "0",
      // Non déductible du scan : à confirmer par l'utilisateur (production ou stock).
      typeSource: "STOCK" as const,
    })),
    totalHT: r.totalHT != null ? Number(r.totalHT) : 0,
    totalTVA: r.totalTVA != null ? Number(r.totalTVA) : 0,
    totalTTC: r.totalTTC != null ? Number(r.totalTTC) : 0,
  };

  return { extracted };
}
