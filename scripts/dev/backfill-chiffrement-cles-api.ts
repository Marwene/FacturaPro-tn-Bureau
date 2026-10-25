/**
 * Backfill de chiffrement des clés API `AppSettings` — lot E3 / audit §3 S-5.
 *
 * Chiffre en AES-256-GCM (format `enc:v1:<iv>:<tag>:<ct>`, cf.
 * `lib/api-keys-crypto.ts`) toutes les colonnes `*ApiKey` encore en clair.
 *
 * Usage :
 *   npx tsx scripts/dev/backfill-chiffrement-cles-api.ts             # DRY-RUN (0 écriture)
 *   npx tsx scripts/dev/backfill-chiffrement-cles-api.ts --execute   # écriture réelle
 *
 * Contrats :
 *   - DRY-RUN par défaut : 0 écriture en base.
 *   - `--execute` SANS `APP_KEYS_ENCRYPTION_KEY` → sortie NON ZERO (exit 1)
 *     avec la marche à suivre, aucune écriture (décision utilisateur 2026-10-23 :
 *     repli en clair côté application, mais le backfill ne doit jamais figer
 *     des valeurs qu'il ne pourrait plus relire).
 *   - Idempotent : une colonne déjà au format `enc:v1:` est inchangée ;
 *     ré-exécution = 0 modification. Compteurs exacts avant/après :
 *     colonnes vides / à chiffrer (en clair) / déjà chiffrées / en clair restantes.
 *   - AUCUNE valeur de clé n'est imprimée (colonnes et compteurs uniquement) ;
 *     `DATABASE_URL` et `APP_KEYS_ENCRYPTION_KEY` ne sont jamais logguées.
 *
 * Motifs repris de `prisma/backfill-mouvements-tresorerie.ts` et
 * `scripts/dev/backfill-dashboard-search-permissions.ts` : header + MODE,
 * section AVANT / DRY-RUN / APRÈS, idempotence vérifiée par re-comptage,
 * sortie non-zero en cas d'échec, `dotenv/config` en tête d'imports.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Prisma } from "@/prisma/generated/prisma/client";
import { DB_KEY_MAP } from "@/lib/api-keys";
import { chiffrer, isChiffre, ENCRYPTION_ENV_VAR } from "@/lib/api-keys-crypto";

interface CompteurColonnes {
    vides: number;
    aChiffrer: string[];
    dejaChiffrees: string[];
}

type ModeArgs = "inconnu" | "dry-run" | "execute";

function resolveArgs(): ModeArgs {
    const argv = process.argv.slice(2);
    const unknown = argv.filter((arg) => arg !== "--execute");
    if (unknown.length > 0) {
        console.error(`❌ Argument(s) inconnu(s) : ${unknown.join(", ")} (attendu : --execute)`);
        return "inconnu";
    }
    return argv.includes("--execute") ? "execute" : "dry-run";
}

function printHeader(mode: string): void {
    console.log("══════════════════════════════════════════════════════════");
    console.log("Backfill E3/S-5 : chiffrement AES-256-GCM des clés API AppSettings");
    console.log(`MODE : ${mode}`);
    console.log(`Format : enc:v1:<iv>:<tag>:<ct> — colonnes : ${Object.values(DB_KEY_MAP).join(", ")}`);
    console.log("══════════════════════════════════════════════════════════");
}

function printCompteur(compteur: CompteurColonnes): void {
    console.log(`  colonnes vides (null / "") : ${compteur.vides}`);
    console.log(
        `  à chiffrer (en clair)      : ${compteur.aChiffrer.length}` +
            (compteur.aChiffrer.length > 0 ? ` [${compteur.aChiffrer.join(", ")}]` : ""),
    );
    console.log(
        `  déjà chiffrées (enc:v1:)   : ${compteur.dejaChiffrees.length}` +
            (compteur.dejaChiffrees.length > 0 ? ` [${compteur.dejaChiffrees.join(", ")}]` : ""),
    );
}

/**
 * Classe chaque colonne de clé : vide / à chiffrer (en clair non vide) /
 * déjà chiffrée (préfixe `enc:v1:` détecté — jamais deviné).
 * `typeof !== "string"` couvre `null` et toute colonne absente de la lecture.
 */
function classerColonnes(
    champs: Record<string, string | null>,
    colonnes: readonly string[],
): CompteurColonnes {
    const compteur: CompteurColonnes = { vides: 0, aChiffrer: [], dejaChiffrees: [] };
    for (const colonne of colonnes) {
        const valeur = champs[colonne];
        if (typeof valeur !== "string" || valeur === "") {
            compteur.vides += 1;
            continue;
        }
        if (isChiffre(valeur)) {
            compteur.dejaChiffrees.push(colonne);
        } else {
            compteur.aChiffrer.push(colonne);
        }
    }
    return compteur;
}

function printMarcheASuivre(): void {
    console.error("❌ APP_KEYS_ENCRYPTION_KEY absente : chiffrement IMPOSSIBLE — aucune écriture effectuée.");
    console.error("   Marche à suivre :");
    console.error("   1. Générer une clé forte (jamais commiter ni partager) :");
    console.error("        openssl rand -base64 32");
    console.error("   2. L'ajouter au .env du serveur (nom de variable imposé) :");
    console.error(`        ${ENCRYPTION_ENV_VAR}=<sortie de l'étape 1>`);
    console.error("   3. Relancer ce script avec --execute.");
    console.error(
        "   Note : sans cette variable, l'application écrit les clés EN CLAIR " +
            "(repli documenté lot E3) — le backfill refuse d'écrire des valeurs " +
            "qu'il ne pourrait plus relire.",
    );
}

async function main(): Promise<void> {
    const mode = resolveArgs();
    if (mode === "inconnu") {
        process.exitCode = 2;
        return;
    }
    const execute = mode === "execute";
    printHeader(execute ? "EXÉCUTION (--execute)" : "DRY-RUN (0 écriture)");

    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.error("❌ DATABASE_URL absente (.env) — aucune exécution possible.");
        process.exitCode = 1;
        return;
    }

    const adapter = new PrismaPg({ connectionString });
    const prisma = new PrismaClient({ adapter });

    try {
        const row = await prisma.appSettings.findFirst();
        if (!row) {
            console.log("Aucune ligne AppSettings — rien à chiffrer.");
            return;
        }

        // Lecture typée des 4 colonnes de clés (toutes `String?` dans AppSettings).
        const champs: Record<string, string | null> = {
            openaiApiKey: row.openaiApiKey,
            geminiApiKey: row.geminiApiKey,
            mistralApiKey: row.mistralApiKey,
            openrouterApiKey: row.openrouterApiKey,
        };
        const colonnes = Object.values(DB_KEY_MAP);
        const avant = classerColonnes(champs, colonnes);

        console.log("── AVANT ──────────────────────────────────────────────────");
        console.log(`  id de la ligne            : ${row.id}`);
        printCompteur(avant);
        console.log(`  total colonnes de clés    : ${colonnes.length}`);

        if (avant.aChiffrer.length === 0) {
            console.log("✅ Rien à chiffrer : toutes les clés non vides sont déjà au format enc:v1: (idempotent).");
            if (!execute) {
                console.log("🧪 DRY-RUN : 0 écriture en base.");
            }
            return;
        }

        if (!execute) {
            if (!process.env[ENCRYPTION_ENV_VAR]) {
                console.warn(
                    `⚠️  ${ENCRYPTION_ENV_VAR} absente : l'exécution --execute échouerait (exit 1) tant qu'elle n'est pas posée.`,
                );
            }
            console.log("── FIN DRY-RUN ────────────────────────────────────────────");
            console.log(`  0 écriture effectuée. ${avant.aChiffrer.length} colonne(s) à chiffrer — relancer avec --execute.`);
            return;
        }

        if (!process.env[ENCRYPTION_ENV_VAR]) {
            printMarcheASuivre();
            process.exitCode = 1;
            return;
        }

        // ── Écriture (uniquement --execute + env posée) ───────────────────────
        // Chaîne if/else typée (jamais d'index dynamique sur le type Prisma) :
        // toute colonne inconnue serait comptée « ignorée » puis détectée par
        // le re-comptage APRÈS (en clair restantes > 0 → sortie non zero).
        const data: Prisma.AppSettingsUpdateInput = {};
        let colonnesIgnorees = 0;
        for (const colonne of avant.aChiffrer) {
            const valeur = champs[colonne];
            if (typeof valeur !== "string" || valeur === "" || isChiffre(valeur)) continue;
            const chiffre = chiffrer(valeur);
            if (colonne === "openaiApiKey") data.openaiApiKey = chiffre;
            else if (colonne === "geminiApiKey") data.geminiApiKey = chiffre;
            else if (colonne === "mistralApiKey") data.mistralApiKey = chiffre;
            else if (colonne === "openrouterApiKey") data.openrouterApiKey = chiffre;
            else colonnesIgnorees += 1;
        }

        await prisma.appSettings.update({ where: { id: row.id }, data });

        // ── Re-comptage idempotent ( APRÈS ) ─────────────────────────────────
        const apresRow = await prisma.appSettings.findFirst();
        if (!apresRow) {
            console.error("❌ Ligne AppSettings disparue pendant le backfill.");
            process.exitCode = 1;
            return;
        }
        const champsApres: Record<string, string | null> = {
            openaiApiKey: apresRow.openaiApiKey,
            geminiApiKey: apresRow.geminiApiKey,
            mistralApiKey: apresRow.mistralApiKey,
            openrouterApiKey: apresRow.openrouterApiKey,
        };
        const apres = classerColonnes(champsApres, colonnes);

        console.log("── APRÈS ─────────────────────────────────────────────────");
        console.log(`  colonnes mises à jour     : ${avant.aChiffrer.length - colonnesIgnorees}`);
        printCompteur(apres);
        if (colonnesIgnorees > 0) {
            console.warn(`⚠️  ${colonnesIgnorees} colonne(s) non reconnues par la chaîne d'écriture — vérifier DB_KEY_MAP.`);
        }

        const succes = apres.aChiffrer.length === 0 && colonnesIgnorees === 0;
        if (succes) {
            console.log(
                `✅ Backfill terminé et idempotent : ${apres.dejaChiffrees.length} colonne(s) chiffrée(s), 0 en clair restante.`,
            );
        } else {
            console.warn(
                `⚠️  ${apres.aChiffrer.length} colonne(s) encore en clair — ré-exécuter --execute après vérification.`,
            );
            process.exitCode = 1;
        }
    } finally {
        await prisma.$disconnect();
    }
}

void main().catch((error: unknown) => {
    console.error(
        "❌ Échec du backfill :",
        error instanceof Error ? error.message : String(error),
    );
    process.exitCode = 1;
});
