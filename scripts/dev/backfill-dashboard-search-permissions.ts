/**
 * Backfill one-shot — lot B3 / S-4 (option a′ approuvée par l'utilisateur).
 *
 * Ajoute `dashboard:voir` et `search:voir` (clés du catalogue PERMISSION_GROUPS)
 * sur TOUS les comptes `role = USER` qui ne les possèdent pas encore.
 *
 * - ADMIN : bypass total, NON touché.
 * - `paiements:voir` / `effets:voir` / `produits:voir` : NON touchés (accord explicite requis).
 * - Union uniquement : aucune permission existante n'est retirée. Idempotent.
 *
 * Usage :
 *   npx tsx scripts/dev/backfill-dashboard-search-permissions.ts             # DRY-RUN (0 écriture)
 *   npx tsx scripts/dev/backfill-dashboard-search-permissions.ts --execute   # écriture réelle
 *
 * Aucun secret imprimé (pas de DATABASE_URL, pas d'e-mail) : id utilisateur uniquement.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, UserRole } from "@/prisma/generated/prisma/client";
import { ALL_PERMISSION_KEYS, type PermissionKey } from "@/lib/permissions";

/** Permissions à garantir aux comptes USER (décision utilisateur, périmètre strict). */
const TARGET_PERMISSIONS: readonly PermissionKey[] = ["dashboard:voir", "search:voir"];

interface PlannedUpdate {
  id: string;
  missing: PermissionKey[];
}

interface UserSnapshot {
  id: string;
  permissions: string[];
}

function resolveArgs(): boolean {
  const argv = process.argv.slice(2);
  const unknown = argv.filter((arg) => arg !== "--execute");
  if (unknown.length > 0) {
    console.error(`❌ Argument(s) inconnu(s) : ${unknown.join(", ")} (attendu : --execute)`);
    process.exit(2);
  }
  return argv.includes("--execute");
}

function assertCatalogKeys(): void {
  for (const permission of TARGET_PERMISSIONS) {
    if (!ALL_PERMISSION_KEYS.includes(permission)) {
      throw new Error(
        `Clé absente du catalogue PERMISSION_GROUPS (lib/permissions.ts) : ${permission}`,
      );
    }
  }
}

function planUpdates(users: readonly UserSnapshot[]): {
  planned: PlannedUpdate[];
  upToDate: number;
} {
  const planned: PlannedUpdate[] = [];
  let upToDate = 0;

  for (const user of users) {
    const current = user.permissions;
    const missing = TARGET_PERMISSIONS.filter((permission) => !current.includes(permission));
    if (missing.length > 0) {
      planned.push({ id: user.id, missing });
    } else {
      upToDate += 1;
    }
  }

  return { planned, upToDate };
}

function printHeader(mode: string): void {
  console.log("══════════════════════════════════════════════════════════");
  console.log("Backfill B3/S-4 (a′) : dashboard:voir + search:voir (USER)");
  console.log(`MODE : ${mode}`);
  console.log(`Cible : ${TARGET_PERMISSIONS.join(", ")}`);
  console.log("══════════════════════════════════════════════════════════");
}

function printPlan(planned: readonly PlannedUpdate[]): void {
  if (planned.length === 0) {
    console.log("Aucun compte USER à mettre à jour.");
    return;
  }
  console.log(`Comptes USER concernés (${planned.length}) :`);
  for (const entry of planned) {
    console.log(`  - ${entry.id}  →  + ${entry.missing.join(", + ")}`);
  }
}

async function main(): Promise<void> {
  const execute = resolveArgs();
  assertCatalogKeys();
  printHeader(execute ? "EXÉCUTION (--execute)" : "DRY-RUN (0 écriture)");

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL absente (.env) — aucune exécution possible.");
  }

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    const totalUsers = await prisma.user.count();
    const adminCount = await prisma.user.count({ where: { role: UserRole.ADMIN } });
    const userSnapshots = await prisma.user.findMany({
      where: { role: UserRole.USER },
      select: { id: true, permissions: true },
      orderBy: { id: "asc" },
    });

    const { planned, upToDate } = planUpdates(userSnapshots);

    console.log("── AVANT ──────────────────────────────────────────────────");
    console.log(`  nb USER total      : ${userSnapshots.length}`);
    console.log(`  nb ADMIN (ignorés) : ${adminCount}`);
    console.log(`  nb comptes total   : ${totalUsers}`);
    console.log(`  nb à modifier      : ${planned.length}`);
    console.log(`  nb déjà à jour     : ${upToDate}`);
    printPlan(planned);

    if (!execute) {
      console.log("── FIN DRY-RUN ────────────────────────────────────────────");
      console.log("  0 écriture effectuée. Relancer avec --execute pour appliquer.");
      return;
    }

    let updated = 0;
    for (const entry of planned) {
      // `push` = ajout atomique : aucune retrait possible, les permissions
      // existantes sont structurellement préservées.
      await prisma.user.update({
        where: { id: entry.id },
        data: { permissions: { push: entry.missing } },
      });
      updated += 1;
    }

    const afterSnapshots = await prisma.user.findMany({
      where: { role: UserRole.USER },
      select: { id: true, permissions: true },
      orderBy: { id: "asc" },
    });
    const after = planUpdates(afterSnapshots);

    console.log("── APRÈS ─────────────────────────────────────────────────");
    console.log(`  nb USER total      : ${afterSnapshots.length}`);
    console.log(`  nb modifiés        : ${updated}`);
    console.log(`  nb déjà à jour     : ${after.upToDate + updated}`);
    console.log(`  nb restant à faire : ${after.planned.length}`);
    console.log(
      updated === planned.length && after.planned.length === 0
        ? "✅ Backfill terminé et idempotent (0 restant)."
        : "⚠️  Des comptes restent à modifier — vérifier avant de conclure.",
    );
    if (after.planned.length > 0) {
      printPlan(after.planned);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`❌ Échec du backfill : ${message}`);
  process.exit(1);
});
