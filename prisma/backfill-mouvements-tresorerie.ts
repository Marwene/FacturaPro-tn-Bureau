/**
 * Backfill du grand livre de trésorerie — lot D1 (audit 2026-10-07 §5).
 *
 * Sources (lecture seule) : Payment, Cheque SANS paymentId, Effet SANS paymentId,
 * MouvementFinancier. Écritures : UNIQUEMENT des INSERT via createMany + skipDuplicates.
 * Aucune donnée existante n'est modifiée ni supprimée.
 *
 * Usage :
 *   npx tsx prisma/backfill-mouvements-tresorerie.ts              → DRY-RUN (0 écriture en base)
 *   npx tsx prisma/backfill-mouvements-tresorerie.ts --execute    → écriture réelle
 *
 * Idempotence : `cleSource` est @unique (`payment:<id>`, `cheque:<id>`, `effet:<id>`,
 * `mf:<id>`) et les insertions passent par createMany({ skipDuplicates: true }) →
 * ré-exécution = 0 doublon.
 *
 * Rapport : stdout + prisma/backfill-reports/backfill-mouvements-tresorerie-<mode>-<ts>.md
 *           (+ CSV des lignes à qualifier en annexe).
 * Aucun secret, e-mail ou nom n'est imprimé (identifiants, enums et montants uniquement ;
 * DATABASE_URL n'est jamais logguée).
 */
import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Prisma } from "@/prisma/generated/prisma/client";
import type {
  ModeReglement,
  SensMouvement,
  StatutMouvement,
  TypeCompte,
} from "@/prisma/generated/prisma/client";
// Règles de sens/mode/statut PARTAGÉES avec l'écriture live (lib/tresorerie) :
// une seule définition dans le repo → le live produit les mêmes écritures que
// le backfill (idempotence de `cleSource`).
import {
  resolveSens,
  paymentMethodToMode,
  paymentStatut,
  chequeStatut,
  effetStatut,
} from "@/lib/tresorerie/sens";

type SourceTag = "Payment" | "Cheque" | "Effet" | "MouvementFinancier";

interface PlannedMouvement {
  cleSource: string;
  source: SourceTag;
  companyId: string;
  compteType: TypeCompte;
  sens: SensMouvement;
  mode: ModeReglement;
  statut: StatutMouvement;
  montant: Prisma.Decimal;
  dateOperation: Date;
  dateValeur: Date | null;
  dateEcheance: Date | null;
  tiersId: string | null;
  invoiceId: string | null;
  achatId: string | null;
  avoirId: string | null;
  chequeId: string | null;
  effetId: string | null;
  paymentId: string | null;
  mouvementFinancierId: string | null;
  motif: string | null;
  indice: SensMouvement | null;
}

interface InvalideRow {
  cleSource: string;
  source: SourceTag;
  companyId: string;
  montant: Prisma.Decimal;
}

interface TiersFlags {
  isClient: boolean;
  isFournisseur: boolean;
}

interface ReconRow {
  companyId: string;
  ancien: Prisma.Decimal;
  nouveau: Prisma.Decimal;
  ecart: Prisma.Decimal;
  nbAQualifier: number;
  montantAQualifier: Prisma.Decimal;
  nbEnAttente: number;
  brutEnAttente: Prisma.Decimal;
  deltaEnAttente: Prisma.Decimal;
  nbReelEnc: number;
  brutReelEnc: Prisma.Decimal;
  deltaReelEnc: Prisma.Decimal;
  nbReelDecaissement: number;
  brutReelDecaissement: Prisma.Decimal;
  absReelDecaissement: Prisma.Decimal;
  deltaReelDecaissement: Prisma.Decimal;
  nbReelSensAQualifier: number;
  brutReelSensAQualifier: Prisma.Decimal;
  deltaReelSensAQualifier: Prisma.Decimal;
  nbReelEncHorsPayment: number;
  netReelEncHorsPayment: Prisma.Decimal;
  soldeInitialExistant: Prisma.Decimal;
  ecartTheorique: Prisma.Decimal;
}

const CHUNK_SIZE = 500;

function zero(): Prisma.Decimal {
  return Prisma.Decimal(0);
}

function fmt(d: Prisma.Decimal): string {
  return d.toFixed(4);
}

function padEnd(s: string, n: number): string {
  return s.length >= n ? s : s + " ".repeat(n - s.length);
}

function padStart(s: string, n: number): string {
  return s.length >= n ? s : " ".repeat(n - s.length) + s;
}

/** Montant absolu strictement positif, ou null si la source vaut 0. */
function absMontant(brut: Prisma.Decimal): Prisma.Decimal | null {
  const abs = brut.abs();
  return abs.isZero() ? null : abs;
}

function joinMotifs(...motifs: (string | null)[]): string | null {
  const kept = motifs.filter((m): m is string => m !== null);
  return kept.length > 0 ? kept.join(" | ") : null;
}

// Les règles resolveSens / paymentMethodToMode / paymentStatut / chequeStatut /
// effetStatut sont importées depuis lib/tresorerie/sens (partagées avec le live D2).

/** Compte : A_QUALIFIER ou mode ESPECES → CAISSE, sinon BANQUE. dateValeur : REALISE uniquement. */
function finalizeRow(base: Omit<PlannedMouvement, "compteType" | "dateValeur">): PlannedMouvement {
  const compteType: TypeCompte =
    base.sens === "A_QUALIFIER" || base.mode === "ESPECES" ? "CAISSE" : "BANQUE";
  const dateValeur: Date | null = base.statut === "REALISE" ? base.dateOperation : null;
  return { ...base, compteType, dateValeur };
}

function suggestionFor(
  row: PlannedMouvement,
  avoirFlags: Map<string, TiersFlags | null>,
): string {
  if (row.avoirId !== null) {
    const flags = avoirFlags.get(row.avoirId) ?? null;
    if (flags === null) {
      return "";
    }
    if (flags.isClient && flags.isFournisseur) {
      return "à trancher (client + fournisseur)";
    }
    if (flags.isClient) {
      return "décaissement";
    }
    if (flags.isFournisseur) {
      return "encaissement";
    }
    return "";
  }
  if (row.indice === "ENCAISSEMENT") {
    return "encaissement (indice)";
  }
  if (row.indice === "DECAISSEMENT") {
    return "décaissement (indice)";
  }
  return "";
}

async function main(): Promise<void> {
  const execute: boolean = process.argv.includes("--execute");
  const modeLabel: string = execute ? "EXECUTE (écriture réelle)" : "DRY-RUN (0 écriture en base)";
  const now = new Date();

  const connectionString: string | undefined = process.env.DATABASE_URL;
  if (connectionString === undefined || connectionString.length === 0) {
    console.error("❌ DATABASE_URL absente : configuration impossible.");
    process.exitCode = 1;
    return;
  }
  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    // ---------------------------------------------------------------- 1. Sources
    const payments = await prisma.payment.findMany({
      include: {
        cheque: { select: { id: true, type: true, dateEcheance: true } },
        effet: { select: { id: true, type: true, dateEcheance: true } },
      },
    });

    const payReferencedChequeIds = new Set(
      payments.map((p) => p.chequeId).filter((id): id is string => id !== null),
    );
    const payReferencedEffetIds = new Set(
      payments.map((p) => p.effetId).filter((id): id is string => id !== null),
    );

    const chequesSansPayment = await prisma.cheque.findMany({
      where: { paymentId: null },
    });
    const effetsSansPayment = await prisma.effet.findMany({ where: { paymentId: null } });
    const totalChequesAvecPayment = await prisma.cheque.count({
      where: { paymentId: { not: null } },
    });
    const totalEffetsAvecPayment = await prisma.effet.count({
      where: { paymentId: { not: null } },
    });

    // Anti-double-comptage symétrique : déjà couvert par un Payment via Payment.chequeId/effetId.
    const chequesCouverts = chequesSansPayment.filter((c) => payReferencedChequeIds.has(c.id));
    const effetsCouverts = effetsSansPayment.filter((e) => payReferencedEffetIds.has(e.id));
    const chequesSeuls = chequesSansPayment.filter((c) => !payReferencedChequeIds.has(c.id));
    const effetsSeuls = effetsSansPayment.filter((e) => !payReferencedEffetIds.has(e.id));

    const mouvementsFinanciers = await prisma.mouvementFinancier.findMany();

    // ---------------------------------------------------------------- 2. Planification
    const planned: PlannedMouvement[] = [];
    const invalides: InvalideRow[] = [];
    const plannedByPaymentId = new Map<string, PlannedMouvement>();

    for (const p of payments) {
      const montant = absMontant(p.montant);
      if (montant === null) {
        invalides.push({
          cleSource: `payment:${p.id}`,
          source: "Payment",
          companyId: p.companyId,
          montant: p.montant,
        });
        continue;
      }
      const resolution = resolveSens({
        chequeType: p.cheque?.type ?? null,
        effetType: p.effet?.type ?? null,
        invoiceId: p.invoiceId,
        achatId: p.achatId,
        avoirId: p.avoirId,
      });
      const statutInfo = paymentStatut(p.status);
      const mode: ModeReglement =
        p.effetId !== null ? "EFFET" : p.chequeId !== null ? "CHEQUE" : paymentMethodToMode(p.methode);
      const row = finalizeRow({
        cleSource: `payment:${p.id}`,
        source: "Payment",
        companyId: p.companyId,
        sens: resolution.sens,
        mode,
        statut: statutInfo.statut,
        montant,
        dateOperation: p.dateReglement,
        dateEcheance: p.cheque?.dateEcheance ?? p.effet?.dateEcheance ?? null,
        tiersId: p.tiersId,
        invoiceId: p.invoiceId,
        achatId: p.achatId,
        avoirId: p.avoirId,
        chequeId: p.chequeId,
        effetId: p.effetId,
        paymentId: p.id,
        mouvementFinancierId: null,
        motif: joinMotifs(resolution.motif, statutInfo.motif),
        indice: resolution.indice,
      });
      planned.push(row);
      plannedByPaymentId.set(p.id, row);
    }

    for (const c of chequesSeuls) {
      const montant = absMontant(c.montant);
      if (montant === null) {
        invalides.push({
          cleSource: `cheque:${c.id}`,
          source: "Cheque",
          companyId: c.companyId,
          montant: c.montant,
        });
        continue;
      }
      const resolution = resolveSens({
        chequeType: c.type,
        effetType: null,
        invoiceId: c.invoiceId,
        achatId: null,
        avoirId: null,
      });
      const statutInfo = chequeStatut(c.status);
      planned.push(
        finalizeRow({
          cleSource: `cheque:${c.id}`,
          source: "Cheque",
          companyId: c.companyId,
          sens: resolution.sens,
          mode: "CHEQUE",
          statut: statutInfo.statut,
          montant,
          dateOperation: c.dateEmission,
          dateEcheance: c.dateEcheance,
          tiersId: c.tiersId,
          invoiceId: c.invoiceId,
          achatId: null,
          avoirId: null,
          chequeId: c.id,
          effetId: null,
          paymentId: null,
          mouvementFinancierId: null,
          motif: joinMotifs(resolution.motif, statutInfo.motif),
          indice: resolution.indice,
        }),
      );
    }

    for (const e of effetsSeuls) {
      const montant = absMontant(e.montant);
      if (montant === null) {
        invalides.push({
          cleSource: `effet:${e.id}`,
          source: "Effet",
          companyId: e.companyId,
          montant: e.montant,
        });
        continue;
      }
      const resolution = resolveSens({
        chequeType: null,
        effetType: e.type,
        invoiceId: e.invoiceId,
        achatId: null,
        avoirId: null,
      });
      const statutInfo = effetStatut(e.status);
      planned.push(
        finalizeRow({
          cleSource: `effet:${e.id}`,
          source: "Effet",
          companyId: e.companyId,
          sens: resolution.sens,
          mode: "EFFET",
          statut: statutInfo.statut,
          montant,
          dateOperation: e.dateCreation,
          dateEcheance: e.dateEcheance,
          // tiersId laissé null : Effet.tireurId / fournisseurId, sens du contrepartie ambigu (décision D1).
          tiersId: null,
          invoiceId: e.invoiceId,
          achatId: null,
          avoirId: null,
          chequeId: null,
          effetId: e.id,
          paymentId: null,
          mouvementFinancierId: null,
          motif: joinMotifs(resolution.motif, statutInfo.motif),
          indice: resolution.indice,
        }),
      );
    }

    for (const m of mouvementsFinanciers) {
      const montant = absMontant(m.montant);
      if (montant === null) {
        invalides.push({
          cleSource: `mf:${m.id}`,
          source: "MouvementFinancier",
          companyId: m.companyId,
          montant: m.montant,
        });
        continue;
      }
      // Décision utilisateur : toutes les lignes en A_QUALIFIER
      // (getMouvementType(tiersId) renvoie toujours CREDIT → un sens calculé serait faux).
      planned.push(
        finalizeRow({
          cleSource: `mf:${m.id}`,
          source: "MouvementFinancier",
          companyId: m.companyId,
          sens: "A_QUALIFIER",
          mode: "ESPECES",
          statut: "A_QUALIFIER",
          montant,
          dateOperation: m.dateMouvement,
          dateEcheance: null,
          tiersId: m.tiersId,
          invoiceId: null,
          achatId: null,
          avoirId: m.avoirId,
          chequeId: null,
          effetId: null,
          paymentId: null,
          mouvementFinancierId: m.id,
          motif: "mouvement-financier: lignes imposees en A_QUALIFIER (decision)",
          indice: null,
        }),
      );
    }

    // ---------------------------------------------------------------- 3. Idempotence
    const allKeys = planned.map((r) => r.cleSource);
    const dejaPresents = new Set<string>();
    if (allKeys.length > 0) {
      const existants = await prisma.mouvementTresorerie.findMany({
        where: { cleSource: { in: allKeys } },
        select: { cleSource: true },
      });
      for (const e of existants) {
        if (e.cleSource !== null) {
          dejaPresents.add(e.cleSource);
        }
      }
    }
    const aInserer = planned.filter((r) => !dejaPresents.has(r.cleSource));

    // ---------------------------------------------------------------- 4. Comptes
    const companyIds = [...new Set(planned.map((r) => r.companyId))].sort();
    const existantsComptes =
      companyIds.length > 0
        ? await prisma.compteTresorerie.findMany({
            where: { companyId: { in: companyIds } },
            select: { id: true, companyId: true, type: true, soldeInitial: true },
          })
        : [];
    const compteByKey = new Map(
      existantsComptes.map((c): [string, (typeof existantsComptes)[number]] => [
        `${c.companyId}:${c.type}`,
        c,
      ]),
    );

    const plusAncien = new Map<string, Date>();
    for (const r of planned) {
      const courant = plusAncien.get(r.companyId);
      if (courant === undefined || r.dateOperation < courant) {
        plusAncien.set(r.companyId, r.dateOperation);
      }
    }

    const comptesACreer: Prisma.CompteTresorerieCreateManyInput[] = [];
    for (const companyId of companyIds) {
      for (const type of ["CAISSE", "BANQUE"] as const) {
        const key = `${companyId}:${type}`;
        if (compteByKey.has(key)) {
          continue;
        }
        comptesACreer.push({
          companyId,
          type,
          libelle: type === "CAISSE" ? "Caisse" : "Banque",
          soldeInitial: 0,
          dateSoldeInitial: plusAncien.get(companyId) ?? now,
        });
      }
    }

    // ---------------------------------------------------------------- 5. Suggestions (avoirs)
    const avoirIds = [
      ...new Set(planned.map((r) => r.avoirId).filter((id): id is string => id !== null)),
    ];
    const avoirs =
      avoirIds.length > 0
        ? await prisma.avoir.findMany({
            where: { id: { in: avoirIds } },
            select: { id: true, tiersId: true },
          })
        : [];
    const tiersIds = [...new Set(avoirs.map((a) => a.tiersId).filter((id): id is string => id !== null))];
    const tiersList =
      tiersIds.length > 0
        ? await prisma.tiers.findMany({
            where: { id: { in: tiersIds } },
            select: { id: true, isClient: true, isFournisseur: true },
          })
        : [];
    const tiersFlagsById = new Map(
      tiersList.map((t): [string, TiersFlags] => [
        t.id,
        { isClient: t.isClient, isFournisseur: t.isFournisseur },
      ]),
    );
    const avoirFlags = new Map<string, TiersFlags | null>();
    for (const a of avoirs) {
      const flags = a.tiersId === null ? null : (tiersFlagsById.get(a.tiersId) ?? null);
      avoirFlags.set(a.id, flags);
    }

    // ---------------------------------------------------------------- 6. Réconciliation
    const recon: ReconRow[] = [];
    for (const companyId of companyIds) {
      let ancien = zero(); // miroir exact du bug : Σ Payment non-annulé, brut, tous sens confondus
      for (const p of payments) {
        if (p.companyId === companyId && p.status !== "ANNULE") {
          ancien = ancien.add(p.montant);
        }
      }
      let nouveau = zero();
      let soldeInitialExistant = zero();
      for (const c of existantsComptes) {
        if (c.companyId === companyId) {
          soldeInitialExistant = soldeInitialExistant.add(c.soldeInitial);
        }
      }
      nouveau = nouveau.add(soldeInitialExistant);

      let nbAQualifier = 0;
      let montantAQualifier = zero();
      for (const r of planned) {
        if (r.companyId !== companyId) {
          continue;
        }
        if (r.sens === "A_QUALIFIER" || r.statut === "A_QUALIFIER") {
          nbAQualifier += 1;
          montantAQualifier = montantAQualifier.add(r.montant);
        }
      }

      // Contribution au NOUVEAU solde des écritures hors Payment (REALISE uniquement).
      let nbReelEncHorsPayment = 0;
      let netReelEncHorsPayment = zero();
      for (const r of planned) {
        if (r.companyId !== companyId || r.source === "Payment" || r.statut !== "REALISE") {
          continue;
        }
        if (r.sens === "ENCAISSEMENT") {
          nbReelEncHorsPayment += 1;
          netReelEncHorsPayment = netReelEncHorsPayment.add(r.montant);
        } else if (r.sens === "DECAISSEMENT") {
          netReelEncHorsPayment = netReelEncHorsPayment.sub(r.montant);
        }
      }

      // Décomposition des payments (brut = miroir exact de l'ancien bug ; abs = nouveau ledger).
      let nbEnAttente = 0;
      let brutEnAttente = zero();
      let nbReelEnc = 0;
      let brutReelEnc = zero();
      let absReelEnc = zero();
      let nbReelDecaissement = 0;
      let brutReelDecaissement = zero();
      let absReelDecaissement = zero();
      let nbReelSensAQualifier = 0;
      let brutReelSensAQualifier = zero();
      for (const p of payments) {
        if (p.companyId !== companyId || p.status === "ANNULE") {
          continue; // annulé : exclu de l'ancien solde ET du nouveau
        }
        const row = plannedByPaymentId.get(p.id);
        if (row === undefined) {
          continue; // montant nul ignoré : contribution 0 des deux côtés
        }
        if (row.statut === "PREVU") {
          nbEnAttente += 1;
          brutEnAttente = brutEnAttente.add(p.montant);
        } else if (row.statut === "ANNULE") {
          // exclu des deux côtés
        } else if (row.sens === "ENCAISSEMENT") {
          nbReelEnc += 1;
          brutReelEnc = brutReelEnc.add(p.montant);
          absReelEnc = absReelEnc.add(row.montant);
        } else if (row.sens === "DECAISSEMENT") {
          nbReelDecaissement += 1;
          brutReelDecaissement = brutReelDecaissement.add(p.montant);
          absReelDecaissement = absReelDecaissement.add(row.montant);
        } else {
          nbReelSensAQualifier += 1;
          brutReelSensAQualifier = brutReelSensAQualifier.add(p.montant);
        }
      }

      // Nouveau solde = soldeInitial + Σ REALISE ENCAISSEMENT − Σ REALISE DECAISSEMENT (toutes sources).
      nouveau = nouveau.add(absReelEnc).sub(absReelDecaissement).add(netReelEncHorsPayment);

      const deltaEnAttente = zero().sub(brutEnAttente);
      const deltaReelEnc = absReelEnc.sub(brutReelEnc);
      const deltaReelDecaissement = zero().sub(absReelDecaissement).sub(brutReelDecaissement);
      const deltaReelSensAQualifier = zero().sub(brutReelSensAQualifier);
      const ecartTheorique = deltaEnAttente
        .add(deltaReelEnc)
        .add(deltaReelDecaissement)
        .add(deltaReelSensAQualifier)
        .add(netReelEncHorsPayment)
        .add(soldeInitialExistant);

      recon.push({
        companyId,
        ancien,
        nouveau,
        ecart: nouveau.sub(ancien),
        nbAQualifier,
        montantAQualifier,
        nbEnAttente,
        brutEnAttente,
        deltaEnAttente,
        nbReelEnc,
        brutReelEnc,
        deltaReelEnc,
        nbReelDecaissement,
        brutReelDecaissement,
        absReelDecaissement,
        deltaReelDecaissement,
        nbReelSensAQualifier,
        brutReelSensAQualifier,
        deltaReelSensAQualifier,
        nbReelEncHorsPayment,
        netReelEncHorsPayment,
        soldeInitialExistant,
        ecartTheorique,
      });
    }

    // ---------------------------------------------------------------- 7. Groupes de motifs
    const motifGroups = new Map<string, { nb: number; montant: Prisma.Decimal }>();
    const aQualifierRows = planned.filter(
      (r) => r.sens === "A_QUALIFIER" || r.statut === "A_QUALIFIER",
    );
    for (const r of aQualifierRows) {
      const cle = r.motif ?? "non précisé";
      const courant = motifGroups.get(cle);
      if (courant === undefined) {
        motifGroups.set(cle, { nb: 1, montant: r.montant });
      } else {
        courant.nb += 1;
        courant.montant = courant.montant.add(r.montant);
      }
    }
    const motifsTries = [...motifGroups.entries()].sort((a, b) => b[1].nb - a[1].nb);

    const nbParSource: Record<SourceTag, number> = {
      Payment: 0,
      Cheque: 0,
      Effet: 0,
      MouvementFinancier: 0,
    };
    const nbParStatut: Record<StatutMouvement, number> = {
      PREVU: 0,
      REALISE: 0,
      ANNULE: 0,
      A_QUALIFIER: 0,
    };
    const nbParSens: Record<SensMouvement, number> = {
      ENCAISSEMENT: 0,
      DECAISSEMENT: 0,
      A_QUALIFIER: 0,
    };
    for (const r of planned) {
      nbParSource[r.source] += 1;
      nbParStatut[r.statut] += 1;
      nbParSens[r.sens] += 1;
    }
    let nbAvoirInvoice = 0;
    for (const r of planned) {
      if (r.avoirId !== null && r.invoiceId !== null) {
        nbAvoirInvoice += 1;
      }
    }
    const effetPayeGroup = motifGroups.get("effet-paye-sans-paiement") ?? { nb: 0, montant: zero() };

    // ---------------------------------------------------------------- 8. Écritures (execute)
    let comptesCrees = 0;
    let mouvementsInsertes = 0;
    if (execute) {
      if (comptesACreer.length > 0) {
        const resComptes = await prisma.compteTresorerie.createMany({
          data: comptesACreer,
          skipDuplicates: true,
        });
        comptesCrees = resComptes.count;
      }
      const comptesApres = await prisma.compteTresorerie.findMany({
        where: { companyId: { in: companyIds } },
        select: { id: true, companyId: true, type: true },
      });
      const compteIdByKey = new Map(
        comptesApres.map((c): [string, string] => [`${c.companyId}:${c.type}`, c.id]),
      );
      const data: Prisma.MouvementTresorerieCreateManyInput[] = [];
      for (const row of aInserer) {
        const key = `${row.companyId}:${row.compteType}`;
        const compteId = compteIdByKey.get(key);
        if (compteId === undefined) {
          throw new Error(`Compte de trésorerie introuvable pour ${key}`);
        }
        data.push({
          companyId: row.companyId,
          compteId,
          sens: row.sens,
          mode: row.mode,
          statut: row.statut,
          montant: row.montant,
          dateOperation: row.dateOperation,
          dateValeur: row.dateValeur,
          dateEcheance: row.dateEcheance,
          tiersId: row.tiersId,
          invoiceId: row.invoiceId,
          achatId: row.achatId,
          avoirId: row.avoirId,
          chequeId: row.chequeId,
          effetId: row.effetId,
          paymentId: row.paymentId,
          mouvementFinancierId: row.mouvementFinancierId,
          cleSource: row.cleSource,
        });
      }
      for (let i = 0; i < data.length; i += CHUNK_SIZE) {
        const res = await prisma.mouvementTresorerie.createMany({
          data: data.slice(i, i + CHUNK_SIZE),
          skipDuplicates: true,
        });
        mouvementsInsertes += res.count;
      }
    }

    // ---------------------------------------------------------------- 9. Rapport
    const lines: string[] = [];
    lines.push("# Backfill mouvements de trésorerie — D1");
    lines.push("");
    lines.push(`- Mode : **${modeLabel}**`);
    lines.push(`- Date d'exécution : ${now.toISOString()}`);
    lines.push(
      "- Sources : Payment (tous), Cheque sans paymentId, Effet sans paymentId, MouvementFinancier",
    );
    lines.push(
      "- Idempotence : `cleSource` @unique + createMany skipDuplicates → ré-exécution = 0 doublon",
    );
    lines.push("");

    lines.push("## 1. Jeu de données (lecture seule)");
    lines.push("");
    lines.push("| Source | En base | Retenues | Écartées |");
    lines.push("|---|---:|---:|---:|");
    lines.push(
      `| Payment | ${payments.length} | ${payments.length} | 0 |`,
    );
    lines.push(
      `| Cheque | ${totalChequesAvecPayment + chequesSansPayment.length} | ${chequesSeuls.length} | ${totalChequesAvecPayment} (paymentId non nul) + ${chequesCouverts.length} (couvert par un Payment via Payment.chequeId) |`,
    );
    lines.push(
      `| Effet | ${totalEffetsAvecPayment + effetsSansPayment.length} | ${effetsSeuls.length} | ${totalEffetsAvecPayment} (paymentId non nul) + ${effetsCouverts.length} (couvert par un Payment via Payment.effetId) |`,
    );
    lines.push(
      `| MouvementFinancier | ${mouvementsFinanciers.length} | ${mouvementsFinanciers.length} | 0 |`,
    );
    lines.push("");

    lines.push("## 2. Comptes de trésorerie");
    lines.push("");
    lines.push(`- Sociétés en périmètre (≥ 1 source) : ${companyIds.length}`);
    lines.push(
      `- Comptes ${execute ? "créés" : "à créer (simulés)"} : ${execute ? comptesCrees : comptesACreer.length}` +
        ` (CAISSE ${comptesACreer.filter((c) => c.type === "CAISSE").length},` +
        ` BANQUE ${comptesACreer.filter((c) => c.type === "BANQUE").length} à créer au total)`,
    );
    lines.push(
      "- soldeInitial = 0 ; dateSoldeInitial = date du plus ancien mouvement de la société (fallback : date d'exécution)",
    );
    lines.push("");

    lines.push("## 3. Mouvements");
    lines.push("");
    lines.push(`- Total planifié : ${planned.length}`);
    lines.push(`- Déjà en base (ignorés) : ${dejaPresents.size}`);
    lines.push(
      `- ${execute ? "Insérés" : "À insérer (simulé)"} : ${execute ? mouvementsInsertes : aInserer.length}`,
    );
    lines.push(`- Montants invalides ignorés (= 0) : ${invalides.length}`);
    lines.push("- Par source :");
    for (const [source, nb] of Object.entries(nbParSource)) {
      lines.push(`    - ${source} : ${nb}`);
    }
    lines.push("- Par statut :");
    for (const [statut, nb] of Object.entries(nbParStatut)) {
      lines.push(`    - ${statut} : ${nb}`);
    }
    lines.push("- Par sens :");
    for (const [sens, nb] of Object.entries(nbParSens)) {
      lines.push(`    - ${sens} : ${nb}`);
    }
    lines.push("");

    lines.push("## 4. Réconciliation par société");
    lines.push("");
    lines.push("Ancien solde = Σ Payment non-annulé (bug actuel, tous sens confondus).");
    lines.push(
      "Nouveau solde = soldeInitial + Σ REALISE ENCAISSEMENT − Σ REALISE DECAISSEMENT.",
    );
    lines.push("");
    lines.push(
      `${padEnd("companyId", 26)} ${padStart("ancien", 16)} ${padStart("nouveau", 16)} ${padStart("écart", 16)} ${padStart("A_QUAL.", 7)} ${padStart("montant A_Q", 16)}`,
    );
    lines.push("-".repeat(90));
    for (const r of recon) {
      lines.push(
        `${padEnd(r.companyId, 26)} ${padStart(fmt(r.ancien), 16)} ${padStart(fmt(r.nouveau), 16)} ${padStart(fmt(r.ecart), 16)} ${padStart(String(r.nbAQualifier), 7)} ${padStart(fmt(r.montantAQualifier), 16)}`,
      );
    }
    lines.push("");
    for (const r of recon) {
      const controle: string =
        r.ecartTheorique.cmp(r.ecart) === 0 ? "OK (écart expliqué)" : "⚠ ÉCART NON EXPLIQUÉ";
      lines.push(`### Société ${r.companyId}`);
      lines.push(`- écart mesuré : ${fmt(r.ecart)}`);
      lines.push(`- écart théorique : ${fmt(r.ecartTheorique)} → contrôle : ${controle}`);
      lines.push("- facteurs :");
      lines.push(
        `    - paiements EN_ATTENTE comptés dans l'ancien solde (bug) : ${r.nbEnAttente} ligne(s), Σ brut ${fmt(r.brutEnAttente)} → contribution ${fmt(r.deltaEnAttente)}`,
      );
      lines.push(
        `    - paiements CONFIRME sens ENCAISSEMENT : ${r.nbReelEnc} ligne(s), Σ brut ${fmt(r.brutReelEnc)} → contribution ${fmt(r.deltaReelEnc)}`,
      );
      lines.push(
        `    - paiements CONFIRME à sens DECAISSEMENT : ${r.nbReelDecaissement} ligne(s), Σ ${fmt(r.absReelDecaissement)} (ancien : comptés en + ; nouveau : en −) → contribution ${fmt(r.deltaReelDecaissement)}`,
      );
      lines.push(
        `    - paiements CONFIRME mais sens A_QUALIFIER : ${r.nbReelSensAQualifier} ligne(s), Σ brut ${fmt(r.brutReelSensAQualifier)} → contribution ${fmt(r.deltaReelSensAQualifier)}`,
      );
      lines.push(
        `    - écritures REALISE hors Payment : ${r.nbReelEncHorsPayment} ligne(s), net ${fmt(r.netReelEncHorsPayment)} (absentes de l'ancien solde)`,
      );
      lines.push(
        `    - lignes A_QUALIFIER (hors ci-dessus) exclues du nouveau solde : ${r.nbAQualifier} ligne(s), Σ ${fmt(r.montantAQualifier)}`,
      );
      lines.push(`    - soldeInitial des comptes existants : ${fmt(r.soldeInitialExistant)}`);
      lines.push("");
    }

    lines.push("## 5. Lignes à qualifier (A_QUALIFIER) — motifs regroupés");
    lines.push("");
    lines.push(`Total : ${aQualifierRows.length} ligne(s) (sens A_QUALIFIER ou statut A_QUALIFIER)`);
    lines.push("");
    lines.push("| motif | nb | montant |");
    lines.push("|---|---:|---:|");
    for (const [motif, g] of motifsTries) {
      lines.push(`| ${motif} | ${g.nb} | ${fmt(g.montant)} |`);
    }
    if (motifsTries.length === 0) {
      lines.push("| (aucune ligne à qualifier) | 0 | 0 |");
    }
    lines.push("");

    lines.push("## 6. CSV des lignes à qualifier");
    lines.push("");
    lines.push("```csv");
    lines.push("cle_source,company_id,source,montant,sens,statut,motif,suggestion");
    for (const r of aQualifierRows) {
      lines.push(
        `${r.cleSource},${r.companyId},${r.source},${fmt(r.montant)},${r.sens},${r.statut},${r.motif ?? ""},${suggestionFor(r, avoirFlags)}`,
      );
    }
    lines.push("```");
    lines.push("");

    lines.push("## 7. Montants invalides ignorés (= 0)");
    lines.push("");
    if (invalides.length === 0) {
      lines.push("- aucun");
    } else {
      for (const i of invalides) {
        lines.push(`- ${i.cleSource} (${i.source}, société ${i.companyId}) : ${fmt(i.montant)}`);
      }
    }
    lines.push("");

    lines.push("## 8. Décisions de mapping (zones d'ombre tranchées, à relire en D2)");
    lines.push("");
    lines.push(
      `- Effet.PAYE sans paymentId → statut A_QUALIFIER (parallèle strict Cheque.ENCAISSE sans paymentId) : ${effetPayeGroup.nb} ligne(s), Σ ${fmt(effetPayeGroup.montant)}`,
    );
    lines.push("- Cheque.ANNULE / Effet.ANNULE → statut ANNULE (fidèle au statut source)");
    lines.push(
      "- MouvementFinancier → sens ET statut A_QUALIFIER (décision utilisateur) ; mode = ESPECES (aucun mode en source, cohérent avec compte CAISSE)",
    );
    lines.push(
      "- tiersId laissé null côté Effet (tireurId/fournisseurId : contrepartie ambiguë) ; devise = TND (défaut du schéma)",
    );
    lines.push(
      `- Chèque/effet déjà référencé par un Payment (Payment.chequeId/effetId) même si paymentId est nul → ignoré côté chèque/effet (anti-double-comptage symétrique) : cheques ${chequesCouverts.length}, effets ${effetsCouverts.length}`,
    );
    lines.push(
      "- invoiceId + achatId sur la même écriture → A_QUALIFIER (contradiction document)",
    );
    lines.push(
      `- invoiceId + avoirId : priorité stricte du schéma appliquée (invoiceId prime → ENCAISSEMENT) : ${nbAvoirInvoice} ligne(s) concernée(s) (diagnostic)`,
    );
    lines.push("");

    const rapport = lines.join("\n");
    const stamp = now.toISOString().slice(0, 19).replace(/[:T]/g, "");
    const reportDir = path.join(process.cwd(), "prisma", "backfill-reports");
    const modeFile = execute ? "execute" : "dry-run";
    await mkdir(reportDir, { recursive: true });
    const mdPath = path.join(reportDir, `backfill-mouvements-tresorerie-${modeFile}-${stamp}.md`);
    await writeFile(mdPath, rapport, "utf8");

    const csvLines = [
      "cle_source,company_id,source,montant,sens,statut,motif,suggestion",
      ...aQualifierRows.map(
        (r) =>
          `${r.cleSource},${r.companyId},${r.source},${fmt(r.montant)},${r.sens},${r.statut},${r.motif ?? ""},${suggestionFor(r, avoirFlags)}`,
      ),
    ];
    const csvPath = path.join(
      reportDir,
      `backfill-mouvements-tresorerie-a-qualifier-${modeFile}-${stamp}.csv`,
    );
    await writeFile(csvPath, csvLines.join("\n") + "\n", "utf8");

    console.log(rapport);
    console.log("");
    console.log(`📄 Rapport   : ${mdPath}`);
    console.log(`📄 CSV AQ    : ${csvPath}`);
    if (!execute) {
      console.log(
        "🧪 DRY-RUN : 0 écriture en base. Ré-exécuter avec --execute (après accord explicite) pour insérer.",
      );
    } else {
      console.log(
        `✅ EXECUTE : ${comptesCrees} compte(s) créé(s), ${mouvementsInsertes} mouvement(s) inséré(s).`,
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error: unknown) => {
  console.error("❌ Échec du backfill :", error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
