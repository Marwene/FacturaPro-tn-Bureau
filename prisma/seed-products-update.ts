// Run this AFTER prisma/seed.ts to add brands, photos, and variants
import "dotenv/config";
import { prisma } from "@/lib/prisma";

async function main() {
    console.log("📸 Adding brands, photos, and variants...");

    // ─── 1. Create missing brands ───
    const [bellota, giasco, uniwork] = await Promise.all([
        prisma.marque.upsert({ where: { nom: "Bellota" }, update: {}, create: { nom: "Bellota" } }),
        prisma.marque.upsert({ where: { nom: "Giasco" }, update: {}, create: { nom: "Giasco" } }),
        prisma.marque.upsert({ where: { nom: "Uniwork" }, update: {}, create: { nom: "Uniwork" } }),
    ]);
    console.log("✅ Brands created: Bellota, Giasco, Uniwork");

    // ─── 2. Brand + photo + variant data for each Chaussure ───
    type VariantDef = { nom: string; attributs: Record<string, string>; stockActuel?: number };

    interface ProductUpdate {
        code: string;
        marqueId?: string;
        photoUrl: string;
        unite: string;
        variants: VariantDef[];
    }

    const updates: ProductUpdate[] = [
        {
            code: "SEC-001", marqueId: bellota.id,
            photoUrl: "https://www.factory-trade.com/45-large_default/botte-de-securite-classic-s3.jpg",
            unite: "Paire",
            variants: [
                { nom: "Noir 36", attributs: { Couleur: "Noir", Pointure: "36" } },
                { nom: "Noir 37", attributs: { Couleur: "Noir", Pointure: "37" } },
                { nom: "Noir 38", attributs: { Couleur: "Noir", Pointure: "38" } },
                { nom: "Noir 39", attributs: { Couleur: "Noir", Pointure: "39" } },
                { nom: "Noir 40", attributs: { Couleur: "Noir", Pointure: "40" } },
                { nom: "Noir 41", attributs: { Couleur: "Noir", Pointure: "41" } },
                { nom: "Noir 42", attributs: { Couleur: "Noir", Pointure: "42" } },
                { nom: "Noir 43", attributs: { Couleur: "Noir", Pointure: "43" } },
                { nom: "Noir 44", attributs: { Couleur: "Noir", Pointure: "44" } },
                { nom: "Noir 45", attributs: { Couleur: "Noir", Pointure: "45" } },
                { nom: "Noir 46", attributs: { Couleur: "Noir", Pointure: "46" } },
            ],
        },
        {
            code: "SEC-002", marqueId: giasco.id,
            photoUrl: "https://www.factory-trade.com/51-large_default/buran-s3.jpg",
            unite: "Paire",
            variants: [
                { nom: "Noir 36", attributs: { Couleur: "Noir", Pointure: "36" } },
                { nom: "Noir 37", attributs: { Couleur: "Noir", Pointure: "37" } },
                { nom: "Noir 38", attributs: { Couleur: "Noir", Pointure: "38" } },
                { nom: "Noir 39", attributs: { Couleur: "Noir", Pointure: "39" } },
                { nom: "Noir 40", attributs: { Couleur: "Noir", Pointure: "40" } },
                { nom: "Noir 41", attributs: { Couleur: "Noir", Pointure: "41" } },
                { nom: "Noir 42", attributs: { Couleur: "Noir", Pointure: "42" } },
                { nom: "Noir 43", attributs: { Couleur: "Noir", Pointure: "43" } },
                { nom: "Noir 44", attributs: { Couleur: "Noir", Pointure: "44" } },
                { nom: "Noir 45", attributs: { Couleur: "Noir", Pointure: "45" } },
                { nom: "Noir 46", attributs: { Couleur: "Noir", Pointure: "46" } },
                { nom: "Noir 47", attributs: { Couleur: "Noir", Pointure: "47" } },
            ],
        },
        {
            code: "SEC-003", marqueId: giasco.id,
            photoUrl: "https://www.factory-trade.com/52-large_default/shamal-s3.jpg",
            unite: "Paire",
            variants: [
                { nom: "Noir 36", attributs: { Couleur: "Noir", Pointure: "36" } },
                { nom: "Noir 37", attributs: { Couleur: "Noir", Pointure: "37" } },
                { nom: "Noir 38", attributs: { Couleur: "Noir", Pointure: "38" } },
                { nom: "Noir 39", attributs: { Couleur: "Noir", Pointure: "39" } },
                { nom: "Noir 40", attributs: { Couleur: "Noir", Pointure: "40" } },
                { nom: "Noir 41", attributs: { Couleur: "Noir", Pointure: "41" } },
                { nom: "Noir 42", attributs: { Couleur: "Noir", Pointure: "42" } },
                { nom: "Noir 43", attributs: { Couleur: "Noir", Pointure: "43" } },
                { nom: "Noir 44", attributs: { Couleur: "Noir", Pointure: "44" } },
                { nom: "Noir 45", attributs: { Couleur: "Noir", Pointure: "45" } },
                { nom: "Noir 46", attributs: { Couleur: "Noir", Pointure: "46" } },
            ],
        },
        {
            code: "SEC-004", marqueId: giasco.id,
            photoUrl: "https://www.factory-trade.com/53-large_default/lipari-s1pl-fo-sr.jpg",
            unite: "Paire",
            variants: [
                { nom: "Noir/Jaune 36", attributs: { Couleur: "Noir/Jaune", Pointure: "36" } },
                { nom: "Noir/Jaune 37", attributs: { Couleur: "Noir/Jaune", Pointure: "37" } },
                { nom: "Noir/Jaune 38", attributs: { Couleur: "Noir/Jaune", Pointure: "38" } },
                { nom: "Noir/Jaune 39", attributs: { Couleur: "Noir/Jaune", Pointure: "39" } },
                { nom: "Noir/Jaune 40", attributs: { Couleur: "Noir/Jaune", Pointure: "40" } },
                { nom: "Noir/Jaune 41", attributs: { Couleur: "Noir/Jaune", Pointure: "41" } },
                { nom: "Noir/Jaune 42", attributs: { Couleur: "Noir/Jaune", Pointure: "42" } },
                { nom: "Noir/Jaune 43", attributs: { Couleur: "Noir/Jaune", Pointure: "43" } },
                { nom: "Noir/Jaune 44", attributs: { Couleur: "Noir/Jaune", Pointure: "44" } },
                { nom: "Noir/Jaune 45", attributs: { Couleur: "Noir/Jaune", Pointure: "45" } },
                { nom: "Noir/Jaune 46", attributs: { Couleur: "Noir/Jaune", Pointure: "46" } },
            ],
        },
        {
            code: "SEC-005", marqueId: giasco.id,
            photoUrl: "https://www.factory-trade.com/54-large_default/polo-s2.jpg",
            unite: "Paire",
            variants: [
                { nom: "Blanc 36", attributs: { Couleur: "Blanc", Pointure: "36" } },
                { nom: "Blanc 37", attributs: { Couleur: "Blanc", Pointure: "37" } },
                { nom: "Blanc 38", attributs: { Couleur: "Blanc", Pointure: "38" } },
                { nom: "Blanc 39", attributs: { Couleur: "Blanc", Pointure: "39" } },
                { nom: "Blanc 40", attributs: { Couleur: "Blanc", Pointure: "40" } },
                { nom: "Blanc 41", attributs: { Couleur: "Blanc", Pointure: "41" } },
                { nom: "Blanc 42", attributs: { Couleur: "Blanc", Pointure: "42" } },
                { nom: "Blanc 43", attributs: { Couleur: "Blanc", Pointure: "43" } },
                { nom: "Blanc 44", attributs: { Couleur: "Blanc", Pointure: "44" } },
                { nom: "Blanc 45", attributs: { Couleur: "Blanc", Pointure: "45" } },
                { nom: "Blanc 46", attributs: { Couleur: "Blanc", Pointure: "46" } },
            ],
        },
        {
            code: "SEC-006", marqueId: giasco.id,
            photoUrl: "https://www.factory-trade.com/55-large_default/oxford-s3.jpg",
            unite: "Paire",
            variants: [
                { nom: "Noir 36", attributs: { Couleur: "Noir", Pointure: "36" } },
                { nom: "Noir 37", attributs: { Couleur: "Noir", Pointure: "37" } },
                { nom: "Noir 38", attributs: { Couleur: "Noir", Pointure: "38" } },
                { nom: "Noir 39", attributs: { Couleur: "Noir", Pointure: "39" } },
                { nom: "Noir 40", attributs: { Couleur: "Noir", Pointure: "40" } },
                { nom: "Noir 41", attributs: { Couleur: "Noir", Pointure: "41" } },
                { nom: "Noir 42", attributs: { Couleur: "Noir", Pointure: "42" } },
                { nom: "Noir 43", attributs: { Couleur: "Noir", Pointure: "43" } },
                { nom: "Noir 44", attributs: { Couleur: "Noir", Pointure: "44" } },
                { nom: "Noir 45", attributs: { Couleur: "Noir", Pointure: "45" } },
                { nom: "Noir 46", attributs: { Couleur: "Noir", Pointure: "46" } },
            ],
        },
        {
            code: "SEC-007", marqueId: giasco.id,
            photoUrl: "https://www.factory-trade.com/56-large_default/aneto-s3l-fo-sr.jpg",
            unite: "Paire",
            variants: [
                { nom: "Noir 36", attributs: { Couleur: "Noir", Pointure: "36" } },
                { nom: "Noir 37", attributs: { Couleur: "Noir", Pointure: "37" } },
                { nom: "Noir 38", attributs: { Couleur: "Noir", Pointure: "38" } },
                { nom: "Noir 39", attributs: { Couleur: "Noir", Pointure: "39" } },
                { nom: "Noir 40", attributs: { Couleur: "Noir", Pointure: "40" } },
                { nom: "Noir 41", attributs: { Couleur: "Noir", Pointure: "41" } },
                { nom: "Noir 42", attributs: { Couleur: "Noir", Pointure: "42" } },
                { nom: "Noir 43", attributs: { Couleur: "Noir", Pointure: "43" } },
                { nom: "Noir 44", attributs: { Couleur: "Noir", Pointure: "44" } },
                { nom: "Noir 45", attributs: { Couleur: "Noir", Pointure: "45" } },
                { nom: "Noir 46", attributs: { Couleur: "Noir", Pointure: "46" } },
            ],
        },
        {
            code: "SEC-008", marqueId: giasco.id,
            photoUrl: "https://www.factory-trade.com/57-large_default/trivor-s3l-fo-sr.jpg",
            unite: "Paire",
            variants: [
                { nom: "Noir 36", attributs: { Couleur: "Noir", Pointure: "36" } },
                { nom: "Noir 37", attributs: { Couleur: "Noir", Pointure: "37" } },
                { nom: "Noir 38", attributs: { Couleur: "Noir", Pointure: "38" } },
                { nom: "Noir 39", attributs: { Couleur: "Noir", Pointure: "39" } },
                { nom: "Noir 40", attributs: { Couleur: "Noir", Pointure: "40" } },
                { nom: "Noir 41", attributs: { Couleur: "Noir", Pointure: "41" } },
                { nom: "Noir 42", attributs: { Couleur: "Noir", Pointure: "42" } },
                { nom: "Noir 43", attributs: { Couleur: "Noir", Pointure: "43" } },
                { nom: "Noir 44", attributs: { Couleur: "Noir", Pointure: "44" } },
                { nom: "Noir 45", attributs: { Couleur: "Noir", Pointure: "45" } },
                { nom: "Noir 46", attributs: { Couleur: "Noir", Pointure: "46" } },
            ],
        },
        {
            code: "SEC-009", marqueId: uniwork.id,
            photoUrl: "https://www.factory-trade.com/378-large_default/lolita-s3.jpg",
            unite: "Paire",
            variants: [
                { nom: "Noir 36", attributs: { Couleur: "Noir", Taille: "36" } },
                { nom: "Noir 38", attributs: { Couleur: "Noir", Taille: "38" } },
                { nom: "Noir 39", attributs: { Couleur: "Noir", Taille: "39" } },
                { nom: "Noir 40", attributs: { Couleur: "Noir", Taille: "40" } },
                { nom: "Noir 42", attributs: { Couleur: "Noir", Taille: "42" } },
            ],
        },
        {
            code: "SEC-010", marqueId: uniwork.id,
            photoUrl: "https://www.factory-trade.com/61-large_default/unimax-s3-wr-ci-src.jpg",
            unite: "Paire",
            variants: [
                { nom: "Marron 36", attributs: { Couleur: "Marron", Pointure: "36" } },
                { nom: "Marron 37", attributs: { Couleur: "Marron", Pointure: "37" } },
                { nom: "Marron 38", attributs: { Couleur: "Marron", Pointure: "38" } },
                { nom: "Marron 39", attributs: { Couleur: "Marron", Pointure: "39" } },
                { nom: "Marron 40", attributs: { Couleur: "Marron", Pointure: "40" } },
                { nom: "Marron 41", attributs: { Couleur: "Marron", Pointure: "41" } },
                { nom: "Marron 42", attributs: { Couleur: "Marron", Pointure: "42" } },
                { nom: "Marron 43", attributs: { Couleur: "Marron", Pointure: "43" } },
                { nom: "Marron 44", attributs: { Couleur: "Marron", Pointure: "44" } },
                { nom: "Marron 45", attributs: { Couleur: "Marron", Pointure: "45" } },
                { nom: "Marron 46", attributs: { Couleur: "Marron", Pointure: "46" } },
            ],
        },
        {
            code: "SEC-011", marqueId: uniwork.id,
            photoUrl: "https://www.factory-trade.com/379-large_default/jackson-s3.jpg",
            unite: "Paire",
            variants: [
                { nom: "Noir 36", attributs: { Couleur: "Noir", Taille: "36" } },
                { nom: "Noir 37", attributs: { Couleur: "Noir", Taille: "37" } },
                { nom: "Noir 38", attributs: { Couleur: "Noir", Taille: "38" } },
                { nom: "Noir 39", attributs: { Couleur: "Noir", Taille: "39" } },
                { nom: "Noir 40", attributs: { Couleur: "Noir", Taille: "40" } },
                { nom: "Noir 41", attributs: { Couleur: "Noir", Taille: "41" } },
                { nom: "Noir 42", attributs: { Couleur: "Noir", Taille: "42" } },
                { nom: "Noir 43", attributs: { Couleur: "Noir", Taille: "43" } },
                { nom: "Noir 44", attributs: { Couleur: "Noir", Taille: "44" } },
                { nom: "Noir 45", attributs: { Couleur: "Noir", Taille: "45" } },
                { nom: "Noir 46", attributs: { Couleur: "Noir", Taille: "46" } },
            ],
        },
        {
            code: "SEC-012", marqueId: uniwork.id,
            photoUrl: "https://www.factory-trade.com/62-large_default/stella-s2.jpg",
            unite: "Paire",
            variants: [
                { nom: "Blanc 36", attributs: { Couleur: "Blanc", Pointure: "36" } },
                { nom: "Blanc 37", attributs: { Couleur: "Blanc", Pointure: "37" } },
                { nom: "Blanc 38", attributs: { Couleur: "Blanc", Pointure: "38" } },
                { nom: "Blanc 39", attributs: { Couleur: "Blanc", Pointure: "39" } },
                { nom: "Blanc 40", attributs: { Couleur: "Blanc", Pointure: "40" } },
                { nom: "Blanc 41", attributs: { Couleur: "Blanc", Pointure: "41" } },
                { nom: "Blanc 42", attributs: { Couleur: "Blanc", Pointure: "42" } },
                { nom: "Blanc 43", attributs: { Couleur: "Blanc", Pointure: "43" } },
                { nom: "Blanc 44", attributs: { Couleur: "Blanc", Pointure: "44" } },
                { nom: "Blanc 45", attributs: { Couleur: "Blanc", Pointure: "45" } },
                { nom: "Blanc 46", attributs: { Couleur: "Blanc", Pointure: "46" } },
            ],
        },
        {
            code: "SEC-013", marqueId: uniwork.id,
            photoUrl: "https://www.factory-trade.com/380-large_default/micro-s3-ci.jpg",
            unite: "Paire",
            variants: [
                { nom: "Noir 36", attributs: { Couleur: "Noir", Taille: "36" } },
                { nom: "Noir 37", attributs: { Couleur: "Noir", Taille: "37" } },
                { nom: "Noir 38", attributs: { Couleur: "Noir", Taille: "38" } },
                { nom: "Noir 39", attributs: { Couleur: "Noir", Taille: "39" } },
                { nom: "Noir 40", attributs: { Couleur: "Noir", Taille: "40" } },
                { nom: "Noir 41", attributs: { Couleur: "Noir", Taille: "41" } },
                { nom: "Noir 42", attributs: { Couleur: "Noir", Taille: "42" } },
                { nom: "Noir 43", attributs: { Couleur: "Noir", Taille: "43" } },
                { nom: "Noir 44", attributs: { Couleur: "Noir", Taille: "44" } },
                { nom: "Noir 45", attributs: { Couleur: "Noir", Taille: "45" } },
                { nom: "Noir 46", attributs: { Couleur: "Noir", Taille: "46" } },
            ],
        },
        {
            code: "SEC-014", marqueId: uniwork.id,
            photoUrl: "https://www.factory-trade.com/63-large_default/perla-sb-a-e-fo.jpg",
            unite: "Paire",
            variants: [
                { nom: "Noir 36", attributs: { Couleur: "Noir", Pointure: "36" } },
                { nom: "Noir 37", attributs: { Couleur: "Noir", Pointure: "37" } },
                { nom: "Noir 38", attributs: { Couleur: "Noir", Pointure: "38" } },
                { nom: "Noir 39", attributs: { Couleur: "Noir", Pointure: "39" } },
                { nom: "Noir 40", attributs: { Couleur: "Noir", Pointure: "40" } },
                { nom: "Noir 41", attributs: { Couleur: "Noir", Pointure: "41" } },
                { nom: "Noir 42", attributs: { Couleur: "Noir", Pointure: "42" } },
                { nom: "Noir 43", attributs: { Couleur: "Noir", Pointure: "43" } },
                { nom: "Noir 44", attributs: { Couleur: "Noir", Pointure: "44" } },
                { nom: "Noir 45", attributs: { Couleur: "Noir", Pointure: "45" } },
                { nom: "Noir 46", attributs: { Couleur: "Noir", Pointure: "46" } },
            ],
        },
        {
            code: "SEC-015", marqueId: uniwork.id,
            photoUrl: "https://www.factory-trade.com/381-large_default/dusky-s3-ci.jpg",
            unite: "Paire",
            variants: [
                { nom: "Noir 36", attributs: { Couleur: "Noir", Taille: "36" } },
                { nom: "Noir 37", attributs: { Couleur: "Noir", Taille: "37" } },
                { nom: "Noir 38", attributs: { Couleur: "Noir", Taille: "38" } },
                { nom: "Noir 39", attributs: { Couleur: "Noir", Taille: "39" } },
                { nom: "Noir 40", attributs: { Couleur: "Noir", Taille: "40" } },
                { nom: "Noir 41", attributs: { Couleur: "Noir", Taille: "41" } },
                { nom: "Noir 42", attributs: { Couleur: "Noir", Taille: "42" } },
                { nom: "Noir 43", attributs: { Couleur: "Noir", Taille: "43" } },
                { nom: "Noir 44", attributs: { Couleur: "Noir", Taille: "44" } },
                { nom: "Noir 45", attributs: { Couleur: "Noir", Taille: "45" } },
                { nom: "Noir 46", attributs: { Couleur: "Noir", Taille: "46" } },
            ],
        },
        {
            code: "SEC-016", marqueId: uniwork.id,
            photoUrl: "https://www.factory-trade.com/64-large_default/onyx-s3.jpg",
            unite: "Paire",
            variants: [
                { nom: "Noir 36", attributs: { Couleur: "Noir", Pointure: "36" } },
                { nom: "Noir 37", attributs: { Couleur: "Noir", Pointure: "37" } },
                { nom: "Noir 38", attributs: { Couleur: "Noir", Pointure: "38" } },
                { nom: "Noir 39", attributs: { Couleur: "Noir", Pointure: "39" } },
                { nom: "Noir 40", attributs: { Couleur: "Noir", Pointure: "40" } },
                { nom: "Noir 41", attributs: { Couleur: "Noir", Pointure: "41" } },
                { nom: "Noir 42", attributs: { Couleur: "Noir", Pointure: "42" } },
                { nom: "Noir 43", attributs: { Couleur: "Noir", Pointure: "43" } },
                { nom: "Noir 44", attributs: { Couleur: "Noir", Pointure: "44" } },
                { nom: "Noir 45", attributs: { Couleur: "Noir", Pointure: "45" } },
                { nom: "Noir 46", attributs: { Couleur: "Noir", Pointure: "46" } },
            ],
        },
        {
            code: "SEC-017", marqueId: uniwork.id,
            photoUrl: "https://www.factory-trade.com/382-large_default/returne-s3-ci.jpg",
            unite: "Paire",
            variants: [
                { nom: "Gris 36", attributs: { Couleur: "Gris", Taille: "36" } },
                { nom: "Gris 37", attributs: { Couleur: "Gris", Taille: "37" } },
                { nom: "Gris 38", attributs: { Couleur: "Gris", Taille: "38" } },
                { nom: "Gris 39", attributs: { Couleur: "Gris", Taille: "39" } },
                { nom: "Gris 40", attributs: { Couleur: "Gris", Taille: "40" } },
                { nom: "Gris 41", attributs: { Couleur: "Gris", Taille: "41" } },
                { nom: "Gris 42", attributs: { Couleur: "Gris", Taille: "42" } },
                { nom: "Gris 43", attributs: { Couleur: "Gris", Taille: "43" } },
                { nom: "Gris 44", attributs: { Couleur: "Gris", Taille: "44" } },
                { nom: "Gris 45", attributs: { Couleur: "Gris", Taille: "45" } },
                { nom: "Gris 46", attributs: { Couleur: "Gris", Taille: "46" } },
            ],
        },
        {
            code: "SEC-018", marqueId: uniwork.id,
            photoUrl: "https://www.factory-trade.com/65-large_default/blanco-s2.jpg",
            unite: "Paire",
            variants: [
                { nom: "Blanc 36", attributs: { Couleur: "Blanc", Pointure: "36" } },
                { nom: "Blanc 37", attributs: { Couleur: "Blanc", Pointure: "37" } },
                { nom: "Blanc 38", attributs: { Couleur: "Blanc", Pointure: "38" } },
                { nom: "Blanc 39", attributs: { Couleur: "Blanc", Pointure: "39" } },
                { nom: "Blanc 40", attributs: { Couleur: "Blanc", Pointure: "40" } },
                { nom: "Blanc 41", attributs: { Couleur: "Blanc", Pointure: "41" } },
                { nom: "Blanc 42", attributs: { Couleur: "Blanc", Pointure: "42" } },
                { nom: "Blanc 43", attributs: { Couleur: "Blanc", Pointure: "43" } },
                { nom: "Blanc 44", attributs: { Couleur: "Blanc", Pointure: "44" } },
                { nom: "Blanc 45", attributs: { Couleur: "Blanc", Pointure: "45" } },
                { nom: "Blanc 46", attributs: { Couleur: "Blanc", Pointure: "46" } },
            ],
        },
        {
            code: "SEC-019", marqueId: uniwork.id,
            photoUrl: "https://www.factory-trade.com/383-large_default/aral-s3-src.jpg",
            unite: "Paire",
            variants: [
                { nom: "Marron 36", attributs: { Couleur: "Marron", Taille: "36" } },
                { nom: "Marron 37", attributs: { Couleur: "Marron", Taille: "37" } },
                { nom: "Marron 38", attributs: { Couleur: "Marron", Taille: "38" } },
                { nom: "Marron 39", attributs: { Couleur: "Marron", Taille: "39" } },
                { nom: "Marron 40", attributs: { Couleur: "Marron", Taille: "40" } },
                { nom: "Marron 41", attributs: { Couleur: "Marron", Taille: "41" } },
                { nom: "Marron 42", attributs: { Couleur: "Marron", Taille: "42" } },
                { nom: "Marron 43", attributs: { Couleur: "Marron", Taille: "43" } },
                { nom: "Marron 44", attributs: { Couleur: "Marron", Taille: "44" } },
                { nom: "Marron 45", attributs: { Couleur: "Marron", Taille: "45" } },
                { nom: "Marron 46", attributs: { Couleur: "Marron", Taille: "46" } },
            ],
        },
        {
            code: "SEC-020", marqueId: uniwork.id,
            photoUrl: "https://www.factory-trade.com/66-large_default/botte-pvc.jpg",
            unite: "Paire",
            variants: [
                { nom: "Blanc 36", attributs: { Couleur: "Blanc", Pointure: "36" } },
                { nom: "Blanc 37", attributs: { Couleur: "Blanc", Pointure: "37" } },
                { nom: "Blanc 38", attributs: { Couleur: "Blanc", Pointure: "38" } },
                { nom: "Blanc 39", attributs: { Couleur: "Blanc", Pointure: "39" } },
                { nom: "Blanc 40", attributs: { Couleur: "Blanc", Pointure: "40" } },
                { nom: "Blanc 41", attributs: { Couleur: "Blanc", Pointure: "41" } },
                { nom: "Blanc 42", attributs: { Couleur: "Blanc", Pointure: "42" } },
                { nom: "Blanc 43", attributs: { Couleur: "Blanc", Pointure: "43" } },
                { nom: "Blanc 44", attributs: { Couleur: "Blanc", Pointure: "44" } },
                { nom: "Blanc 45", attributs: { Couleur: "Blanc", Pointure: "45" } },
                { nom: "Blanc 46", attributs: { Couleur: "Blanc", Pointure: "46" } },
            ],
        },
        {
            code: "SEC-021", marqueId: uniwork.id,
            photoUrl: "https://www.factory-trade.com/386-large_default/anete-s3.jpg",
            unite: "Paire",
            variants: [
                { nom: "Noir 36", attributs: { Couleur: "Noir", Taille: "36" } },
                { nom: "Noir 37", attributs: { Couleur: "Noir", Taille: "37" } },
                { nom: "Noir 38", attributs: { Couleur: "Noir", Taille: "38" } },
                { nom: "Noir 39", attributs: { Couleur: "Noir", Taille: "39" } },
                { nom: "Noir 40", attributs: { Couleur: "Noir", Taille: "40" } },
                { nom: "Noir 41", attributs: { Couleur: "Noir", Taille: "41" } },
                { nom: "Noir 42", attributs: { Couleur: "Noir", Taille: "42" } },
                { nom: "Noir 43", attributs: { Couleur: "Noir", Taille: "43" } },
                { nom: "Noir 44", attributs: { Couleur: "Noir", Taille: "44" } },
                { nom: "Noir 45", attributs: { Couleur: "Noir", Taille: "45" } },
                { nom: "Noir 46", attributs: { Couleur: "Noir", Taille: "46" } },
            ],
        },
        {
            code: "SEC-022", marqueId: uniwork.id,
            photoUrl: "https://www.factory-trade.com/67-large_default/botte-pvc-s5-src.jpg",
            unite: "Paire",
            variants: [
                { nom: "Jaune 36", attributs: { Couleur: "Jaune", Pointure: "36" } },
                { nom: "Jaune 37", attributs: { Couleur: "Jaune", Pointure: "37" } },
                { nom: "Jaune 38", attributs: { Couleur: "Jaune", Pointure: "38" } },
                { nom: "Jaune 39", attributs: { Couleur: "Jaune", Pointure: "39" } },
                { nom: "Jaune 40", attributs: { Couleur: "Jaune", Pointure: "40" } },
                { nom: "Jaune 41", attributs: { Couleur: "Jaune", Pointure: "41" } },
                { nom: "Jaune 42", attributs: { Couleur: "Jaune", Pointure: "42" } },
                { nom: "Jaune 43", attributs: { Couleur: "Jaune", Pointure: "43" } },
                { nom: "Jaune 44", attributs: { Couleur: "Jaune", Pointure: "44" } },
                { nom: "Jaune 45", attributs: { Couleur: "Jaune", Pointure: "45" } },
                { nom: "Jaune 46", attributs: { Couleur: "Jaune", Pointure: "46" } },
            ],
        },
        {
            code: "SEC-023", marqueId: uniwork.id,
            photoUrl: "https://www.factory-trade.com/349-large_default/perla-sb-a-e-fo.jpg",
            unite: "Paire",
            variants: [
                { nom: "Blanc 36", attributs: { Couleur: "Blanc", Taille: "36" } },
                { nom: "Blanc 37", attributs: { Couleur: "Blanc", Taille: "37" } },
                { nom: "Blanc 38", attributs: { Couleur: "Blanc", Taille: "38" } },
                { nom: "Blanc 39", attributs: { Couleur: "Blanc", Taille: "39" } },
                { nom: "Blanc 40", attributs: { Couleur: "Blanc", Taille: "40" } },
                { nom: "Blanc 41", attributs: { Couleur: "Blanc", Taille: "41" } },
                { nom: "Blanc 42", attributs: { Couleur: "Blanc", Taille: "42" } },
                { nom: "Blanc 43", attributs: { Couleur: "Blanc", Taille: "43" } },
                { nom: "Blanc 44", attributs: { Couleur: "Blanc", Taille: "44" } },
                { nom: "Blanc 45", attributs: { Couleur: "Blanc", Taille: "45" } },
                { nom: "Blanc 46", attributs: { Couleur: "Blanc", Taille: "46" } },
            ],
        },
    ];

    // ─── 3. Apply updates ───
    for (const u of updates) {
        const product = await prisma.product.findFirst({ where: { code: u.code } });
        if (!product) { console.warn(`⚠️  Product ${u.code} not found`); continue; }

        // Update photoUrl + marqueId
        await prisma.product.update({
            where: { id: product.id },
            data: { photoUrl: u.photoUrl, marqueId: u.marqueId, unite: u.unite },
        });

        // Create variants
        for (let i = 0; i < u.variants.length; i++) {
            const v = u.variants[i];
            await prisma.productVariant.create({
                data: {
                    productId: product.id,
                    nom: v.nom,
                    attributs: v.attributs,
                    stockActuel: 0,
                    stockMinimum: 0,
                    actif: true,
                    ordre: i,
                },
            });
        }

        console.log(`  ✅ ${u.code} — ${u.variants.length} variants`);
    }

    // ─── 4. Vêtements de Travail: photos + variants ───
    const vetPhotoMap: Record<string, string> = {
        "VET-001": "https://www.factory-trade.com/192-large_default/blouse-antistatique-esd.jpg",
        "VET-002": "https://www.factory-trade.com/160-large_default/parka-multiforme-fuzz.jpg",
        "VET-003": "https://www.factory-trade.com/204-large_default/pantalon-multirisques.jpg",
        "VET-004": "https://www.factory-trade.com/194-large_default/blouse-standard.jpg",
        "VET-005": "https://www.factory-trade.com/162-large_default/parka-multiforme-fuzz.jpg",
        "VET-006": "https://www.factory-trade.com/79-large_default/combinaison-anti-chimique-spacel-4000.jpg",
        "VET-007": "https://www.factory-trade.com/205-large_default/pantalon-poches-genouilleres.jpg",
        "VET-008": "https://www.factory-trade.com/195-large_default/blouse-unisexe-poly-viscose.jpg",
        "VET-009": "https://www.factory-trade.com/166-large_default/parka-multiforme-fuzz.jpg",
        "VET-010": "https://www.factory-trade.com/85-large_default/gilet-haute-visibilite.jpg",
        "VET-011": "https://www.factory-trade.com/207-large_default/pantalon-5-poches-essentiels.jpg",
        "VET-012": "https://www.factory-trade.com/202-large_default/blouse-agroalimentaire.jpg",
        "VET-013": "https://www.factory-trade.com/174-large_default/parka-multiforme-fuzz.jpg",
        "VET-014": "https://www.factory-trade.com/88-large_default/parka-haute-visibilite-basique.jpg",
        "VET-015": "https://www.factory-trade.com/217-large_default/kit-de-travail-488-ccr-pcr.jpg",
        "VET-016": "https://www.factory-trade.com/180-large_default/parka-multiforme-fuzz.jpg",
        "VET-017": "https://www.factory-trade.com/89-large_default/kit-pluie-ingenieur.jpg",
        "VET-018": "https://www.factory-trade.com/97-large_default/pantalon-prestige.jpg",
        "VET-019": "https://www.factory-trade.com/102-large_default/manteau-de-pluie-polyester-enduit-double-face-pvc.jpg",
        "VET-020": "https://www.factory-trade.com/104-large_default/ensemble-de-pluie-polyester-enduit-pvc-p400.jpg",
        "VET-021": "https://www.factory-trade.com/109-large_default/combinaison-dt117-5b-6b.jpg",
        "VET-022": "https://www.factory-trade.com/111-large_default/combinaison-c0600.jpg",
    };

    const sizes = ["S", "M", "L", "XL", "2XL", "3XL"];
    const taillesPantalon = ["36", "38", "40", "42", "44", "46", "48", "50", "52"];

    interface VetUpdate {
        photoUrl: string;
        variants: VariantDef[];
    }

    const vetUpdates: Record<string, VetUpdate> = {};
    for (const [code, url] of Object.entries(vetPhotoMap)) {
        const nom = code; // will lookup by code
        let vars: VariantDef[];
        if (["VET-003", "VET-007", "VET-011", "VET-018"].includes(code)) {
            // Pantalons: tailles
            vars = taillesPantalon.map((t, i) => ({
                nom: `Noir T.${t}`,
                attributs: { Couleur: "Noir", Taille: t },
            }));
        } else if (["VET-015", "VET-017", "VET-019", "VET-020"].includes(code)) {
            // Kits: sizes
            vars = sizes.map((s) => ({
                nom: `Unique ${s}`,
                attributs: { Taille: s },
            }));
        } else if (["VET-021", "VET-022"].includes(code)) {
            // Combinaisons jetables: sizes
            vars = sizes.map((s) => ({
                nom: `Unique ${s}`,
                attributs: { Taille: s },
            }));
        } else if (code === "VET-010") {
            // Gilet HV: Jaune, sizes
            vars = sizes.map((s) => ({
                nom: `Jaune ${s}`,
                attributs: { Couleur: "Jaune", Taille: s },
            }));
        } else if (code === "VET-006") {
            // Combinaison anti-chimique: sizes
            vars = sizes.map((s) => ({
                nom: `Unique ${s}`,
                attributs: { Taille: s },
            }));
        } else {
            // Vêtements standard: sizes
            vars = sizes.map((s) => ({
                nom: `Blanc ${s}`,
                attributs: { Couleur: "Blanc", Taille: s },
            }));
        }
        vetUpdates[code] = { photoUrl: url, variants: vars };
    }

    for (const [code, u] of Object.entries(vetUpdates)) {
        const product = await prisma.product.findFirst({ where: { code } });
        if (!product) { console.warn(`⚠️  VET ${code} not found`); continue; }

        await prisma.product.update({
            where: { id: product.id },
            data: { photoUrl: u.photoUrl },
        });

        for (let i = 0; i < u.variants.length; i++) {
            const v = u.variants[i];
            await prisma.productVariant.create({
                data: {
                    productId: product.id,
                    nom: v.nom,
                    attributs: v.attributs,
                    stockActuel: 0,
                    stockMinimum: 0,
                    actif: true,
                    ordre: i,
                },
            });
        }

        console.log(`  ✅ ${code} — photo + ${u.variants.length} variants`);
    }

    console.log("✅ All updates complete!");
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });
