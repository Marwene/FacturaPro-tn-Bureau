/**
 * Tests du module d'écriture du grand livre — lot D2.
 * Prisma est mocké : on vérifie les APPELS (shape des écritures, règles de
 * contre-passation, retrait des PREVU) sans base de données.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
    compteUpsert: vi.fn(),
    mouvementCreate: vi.fn(),
    mouvementFindUnique: vi.fn(),
    mouvementFindFirst: vi.fn(),
    mouvementUpdate: vi.fn(),
    chequeFindUnique: vi.fn(),
    effetFindUnique: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
    prisma: {
        compteTresorerie: { upsert: db.compteUpsert },
        mouvementTresorerie: {
            create: db.mouvementCreate,
            findUnique: db.mouvementFindUnique,
            findFirst: db.mouvementFindFirst,
            update: db.mouvementUpdate,
        },
        cheque: { findUnique: db.chequeFindUnique },
        effet: { findUnique: db.effetFindUnique },
    },
}));

import {
    MontantNonPositifError,
    MouvementDejaAnnuleError,
    MouvementIntrouvableError,
    annulerMouvement,
    enregistrerMouvement,
    enregistrerMouvementPourPayment,
    retirerMouvementPrevu,
    sensInverse,
    synchroniserMouvementPaiement,
    typeComptePour,
    type PaiementSource,
} from "@/lib/tresorerie/ledger";
import { aRecevoir, soldeReel } from "@/lib/tresorerie/compute";
import { cleSourceCheque, cleSourceEffet } from "@/lib/tresorerie/source-keys";
import { prisma } from "@/lib/prisma";
import type { ModeReglement, SensMouvement, StatutMouvement } from "@/prisma/generated/prisma/client";

const COMPANY = "company-a";

const ligneBase = {
    id: "mnt-1",
    companyId: COMPANY,
    compteId: "compte-1",
    sens: "ENCAISSEMENT" as const,
    mode: "ESPECES" as const,
    statut: "REALISE" as const,
    montant: "100.0000",
    devise: "TND",
    montantTND: null,
    dateOperation: new Date("2026-02-01"),
    dateValeur: new Date("2026-02-01"),
    dateEcheance: null,
    tiersId: null,
    invoiceId: null,
    achatId: null,
    avoirId: null,
    chequeId: null,
    effetId: null,
    paymentId: null,
    mouvementFinancierId: null,
    libelle: null,
    reference: null,
    notes: null,
    cleSource: "payment:p1",
    annuleParId: null,
    annuleLe: null,
};

const paiementBase: PaiementSource = {
    id: "p1",
    companyId: COMPANY,
    montant: { toString: () => "100.000" },
    methode: "ESPECES",
    status: "CONFIRME",
    dateReglement: new Date("2026-02-01"),
    tiersId: "tiers-1",
    invoiceId: "inv-1",
    achatId: null,
    avoirId: null,
    chequeId: null,
    effetId: null,
    reference: null,
};

beforeEach(() => {
    // resetAllMocks (et non clearAllMocks) : les mockResolvedValue posés par un
    // test ne doivent PAS fuiter dans le test suivant.
    vi.resetAllMocks();
    db.compteUpsert.mockResolvedValue({ id: "compte-1" });
    db.mouvementCreate.mockImplementation(async (arg: { data: Record<string, unknown> }) => ({
        ...ligneBase,
        ...arg.data,
        id: "mnt-inverse",
    }));
});

describe("ledger — helpers de sens", () => {
    it("sensInverse échange ENCAISSEMENT et DECAISSEMENT", () => {
        expect(sensInverse("ENCAISSEMENT")).toBe("DECAISSEMENT");
        expect(sensInverse("DECAISSEMENT")).toBe("ENCAISSEMENT");
    });

    it("typeComptePour : A_QUALIFIER ou ESPECES → CAISSE, sinon BANQUE", () => {
        expect(typeComptePour("A_QUALIFIER", "VIREMENT")).toBe("CAISSE");
        expect(typeComptePour("ENCAISSEMENT", "ESPECES")).toBe("CAISSE");
        expect(typeComptePour("ENCAISSEMENT", "CHEQUE")).toBe("BANQUE");
        expect(typeComptePour("DECAISSEMENT", "EFFET")).toBe("BANQUE");
    });
});

describe("ledger — enregistrerMouvement", () => {
    it("résout le compte par upsert puis écrit le mouvement (montant à 4 décimales)", async () => {
        await enregistrerMouvement(prisma, {
            companyId: COMPANY,
            compteType: "CAISSE",
            sens: "ENCAISSEMENT",
            mode: "ESPECES",
            statut: "REALISE",
            montant: "100.123456",
            dateOperation: new Date("2026-02-01"),
            cleSource: "payment:p1",
        });

        expect(db.compteUpsert).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { companyId_type: { companyId: COMPANY, type: "CAISSE" } },
            }),
        );
        expect(db.mouvementCreate).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    companyId: COMPANY,
                    compteId: "compte-1",
                    sens: "ENCAISSEMENT",
                    mode: "ESPECES",
                    statut: "REALISE",
                    montant: "100.1235",
                    cleSource: "payment:p1",
                    // dateValeur = dateOperation pour un REALISE (règle D2).
                    dateValeur: new Date("2026-02-01"),
                }),
            }),
        );
    });

    it("dateValeur reste null pour un PREVU", async () => {
        await enregistrerMouvement(prisma, {
            companyId: COMPANY,
            compteType: "BANQUE",
            sens: "DECAISSEMENT",
            mode: "CHEQUE",
            statut: "PREVU",
            montant: "10",
            dateOperation: new Date("2026-02-01"),
            cleSource: "cheque:c1",
        });
        const data = db.mouvementCreate.mock.calls[0][0].data;
        expect(data.dateValeur).toBeNull();
    });

    it("refuse un montant non strictement positif", async () => {
        await expect(
            enregistrerMouvement(prisma, {
                companyId: COMPANY,
                compteType: "CAISSE",
                sens: "ENCAISSEMENT",
                mode: "ESPECES",
                statut: "REALISE",
                montant: "0",
                dateOperation: new Date("2026-02-01"),
                cleSource: null,
            }),
        ).rejects.toThrow(MontantNonPositifError);
        expect(db.mouvementCreate).not.toHaveBeenCalled();
    });
});

describe("ledger — enregistrerMouvementPourPayment", () => {
    it("payment CONFIRME facture espèces → ENCAISSEMENT REALISE, clé payment:<id>", async () => {
        await enregistrerMouvementPourPayment(prisma, paiementBase);

        const data = db.mouvementCreate.mock.calls[0][0].data;
        expect(data.sens).toBe("ENCAISSEMENT");
        expect(data.mode).toBe("ESPECES");
        expect(data.statut).toBe("REALISE");
        expect(data.cleSource).toBe("payment:p1");
        expect(data.paymentId).toBe("p1");
        expect(data.invoiceId).toBe("inv-1");
    });

    it("payment EN_ATTENTE → statut PREVU", async () => {
        await enregistrerMouvementPourPayment(prisma, { ...paiementBase, status: "EN_ATTENTE" });
        expect(db.mouvementCreate.mock.calls[0][0].data.statut).toBe("PREVU");
    });

    it("un achat produit un DECAISSEMENT", async () => {
        await enregistrerMouvementPourPayment(prisma, {
            ...paiementBase,
            invoiceId: null,
            achatId: "achat-1",
        });
        expect(db.mouvementCreate.mock.calls[0][0].data.sens).toBe("DECAISSEMENT");
    });

    it("un avoir seul produit un A_QUALIFIER (direction non déterminable)", async () => {
        await enregistrerMouvementPourPayment(prisma, {
            ...paiementBase,
            invoiceId: null,
            avoirId: "avoir-1",
        });
        expect(db.mouvementCreate.mock.calls[0][0].data.sens).toBe("A_QUALIFIER");
    });

    it("un chèque EMIS paie une facture → A_QUALIFIER (instrument vs document contradictoires)", async () => {
        db.chequeFindUnique.mockResolvedValue({ type: "EMIS", dateEcheance: new Date("2026-03-01") });

        await enregistrerMouvementPourPayment(prisma, {
            ...paiementBase,
            methode: "CHEQUE",
            chequeId: "ch1",
        });

        const data = db.mouvementCreate.mock.calls[0][0].data;
        expect(data.sens).toBe("A_QUALIFIER");
        expect(data.mode).toBe("CHEQUE");
        expect(data.notes).toContain("instrument-contradictoire");
        // L'échéance du chèque est reportée sur le mouvement.
        expect(data.dateEcheance).toEqual(new Date("2026-03-01"));
    });

    it("un chèque RECU paie une facture → ENCAISSEMENT (l'instrument prime)", async () => {
        db.chequeFindUnique.mockResolvedValue({ type: "RECU", dateEcheance: null });

        await enregistrerMouvementPourPayment(prisma, {
            ...paiementBase,
            methode: "CHEQUE",
            chequeId: "ch1",
        });
        expect(db.mouvementCreate.mock.calls[0][0].data.sens).toBe("ENCAISSEMENT");
    });

    it("un effet référencé impose le mode EFFET (jamais VIREMENT)", async () => {
        db.effetFindUnique.mockResolvedValue({ type: "RECU", dateEcheance: new Date("2026-04-01") });

        await enregistrerMouvementPourPayment(prisma, {
            ...paiementBase,
            methode: "VIREMENT",
            effetId: "ef1",
        });

        const data = db.mouvementCreate.mock.calls[0][0].data;
        expect(data.mode).toBe("EFFET");
        expect(data.sens).toBe("ENCAISSEMENT");
    });

    it("un paiement d'avoir (aucun document directionnel) reste A_QUALIFIER", async () => {
        await enregistrerMouvementPourPayment(prisma, {
            ...paiementBase,
            invoiceId: null,
            avoirId: "av1",
            methode: "VIREMENT",
        });
        expect(db.mouvementCreate.mock.calls[0][0].data.sens).toBe("A_QUALIFIER");
    });
});

describe("ledger — retirerMouvementPrevu", () => {
    it("met un PREVU à ANNULE avec motif (retrait, jamais suppression)", async () => {
        db.mouvementFindUnique.mockResolvedValue({ ...ligneBase, statut: "PREVU", notes: null });

        await retirerMouvementPrevu(prisma, {
            companyId: COMPANY,
            cleSource: "cheque:c1",
            motif: "chèque encaissé",
        });

        expect(db.mouvementUpdate).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: "mnt-1" },
                data: expect.objectContaining({ statut: "ANNULE", notes: "chèque encaissé" }),
            }),
        );
        expect(db.mouvementCreate).not.toHaveBeenCalled();
    });

    it("ne touche PAS à une écriture REALISE (elle doit être contre-passée)", async () => {
        db.mouvementFindUnique.mockResolvedValue({ ...ligneBase, statut: "REALISE" });

        const resultat = await retirerMouvementPrevu(prisma, {
            companyId: COMPANY,
            cleSource: "cheque:c1",
            motif: "inutile",
        });

        expect(db.mouvementUpdate).not.toHaveBeenCalled();
        expect(resultat?.statut).toBe("REALISE");
    });

    it("retourne null si la clé est absente ou si la société diffère", async () => {
        db.mouvementFindUnique.mockResolvedValue(null);
        expect(
            await retirerMouvementPrevu(prisma, { companyId: COMPANY, cleSource: "cheque:c1", motif: "m" }),
        ).toBeNull();

        db.mouvementFindUnique.mockResolvedValue({ ...ligneBase, companyId: "company-b" });
        expect(
            await retirerMouvementPrevu(prisma, { companyId: COMPANY, cleSource: "cheque:c1", motif: "m" }),
        ).toBeNull();
    });
});

describe("ledger — annulerMouvement (contre-passation pure)", () => {
    it("PREVU → ANNULE sans écriture inverse (règle 3)", async () => {
        db.mouvementFindFirst.mockResolvedValue({ ...ligneBase, statut: "PREVU" });

        const resultat = await annulerMouvement(prisma, {
            companyId: COMPANY,
            mouvementId: "mnt-1",
        });

        expect(db.mouvementCreate).not.toHaveBeenCalled();
        expect(db.mouvementUpdate).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ statut: "ANNULE" }),
            }),
        );
        expect(resultat.inverse).toBeNull();
    });

    it("REALISE → l'origine reste REALISE, l'inverse au sens opposé compense (règle 1+2)", async () => {
        db.mouvementFindFirst.mockResolvedValue({
            ...ligneBase,
            sens: "ENCAISSEMENT",
            cleSource: "payment:p1",
        });
        db.mouvementUpdate.mockResolvedValue({ ...ligneBase, annuleParId: "mnt-inverse" });

        const resultat = await annulerMouvement(prisma, {
            companyId: COMPANY,
            mouvementId: "mnt-1",
            annuleLe: new Date("2026-02-05"),
            motif: "annulé",
        });

        // Écriture inverse : sens opposé, REALISE, clé :contrepassation.
        expect(db.mouvementCreate).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    sens: "DECAISSEMENT",
                    statut: "REALISE",
                    montant: ligneBase.montant,
                    cleSource: "payment:p1:contrepassation",
                    libelle: "Contre-passation",
                    annuleLe: new Date("2026-02-05"),
                }),
            }),
        );
        // annuleParId vit sur l'ORIGINALE qui reste REALISE.
        expect(db.mouvementUpdate).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: "mnt-1" },
                data: expect.objectContaining({ annuleParId: "mnt-inverse" }),
            }),
        );
        expect(resultat.origine.statut).toBe("REALISE");
        expect(resultat.inverse).not.toBeNull();
    });

    it("refuse une écriture introuvable ou déjà annulée", async () => {
        db.mouvementFindFirst.mockResolvedValue(null);
        await expect(
            annulerMouvement(prisma, { companyId: COMPANY, mouvementId: "inconnu" }),
        ).rejects.toThrow(MouvementIntrouvableError);

        db.mouvementFindFirst.mockResolvedValue({ ...ligneBase, annuleParId: "mnt-x" });
        await expect(
            annulerMouvement(prisma, { companyId: COMPANY, mouvementId: "mnt-1" }),
        ).rejects.toThrow(MouvementDejaAnnuleError);
    });

    it("scoppe la recherche sur companyId (aucun accès inter-sociétés)", async () => {
        db.mouvementFindFirst.mockResolvedValue(null);
        await expect(
            annulerMouvement(prisma, { companyId: COMPANY, mouvementId: "mnt-b" }),
        ).rejects.toThrow(MouvementIntrouvableError);
        expect(db.mouvementFindFirst).toHaveBeenCalledWith({
            where: { id: "mnt-b", companyId: COMPANY },
        });
    });
});

describe("ledger — synchroniserMouvementPaiement", () => {
    it("EN_ATTENTE → CONFIRME : le PREVU devient REALISE à la date de règlement", async () => {
        db.mouvementFindUnique.mockResolvedValue({ ...ligneBase, statut: "PREVU" });

        await synchroniserMouvementPaiement(prisma, {
            paiement: paiementBase,
            nouveauStatut: "CONFIRME",
        });

        expect(db.mouvementUpdate).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    statut: "REALISE",
                    dateOperation: paiementBase.dateReglement,
                    dateValeur: paiementBase.dateReglement,
                }),
            }),
        );
    });

    it("→ ANNULE sur un REALISE : contre-passation (pas de statut ANNULE sur l'originale)", async () => {
        db.mouvementFindUnique.mockResolvedValue({
            ...ligneBase,
            statut: "REALISE",
            cleSource: "payment:p1",
        });
        db.mouvementFindFirst.mockResolvedValue({
            ...ligneBase,
            statut: "REALISE",
            cleSource: "payment:p1",
        });
        db.mouvementUpdate.mockResolvedValue({ ...ligneBase, annuleParId: "mnt-inverse" });

        const resultat = await synchroniserMouvementPaiement(prisma, {
            paiement: paiementBase,
            nouveauStatut: "ANNULE",
        });

        expect(db.mouvementCreate).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ sens: "DECAISSEMENT", statut: "REALISE" }),
            }),
        );
        expect(resultat?.inverse).not.toBeNull();
    });

    it("→ ANNULE sur un PREVU : simple passage à ANNULE, sans inverse", async () => {
        db.mouvementFindUnique.mockResolvedValue({ ...ligneBase, statut: "PREVU" });
        db.mouvementFindFirst.mockResolvedValue({ ...ligneBase, statut: "PREVU" });

        const resultat = await synchroniserMouvementPaiement(prisma, {
            paiement: paiementBase,
            nouveauStatut: "ANNULE",
        });

        expect(db.mouvementCreate).not.toHaveBeenCalled();
        expect(resultat?.inverse).toBeNull();
    });

    it("retourne null si le paiement n'a aucune écriture (pas de double écriture)", async () => {
        db.mouvementFindUnique.mockResolvedValue(null);
        const resultat = await synchroniserMouvementPaiement(prisma, {
            paiement: paiementBase,
            nouveauStatut: "CONFIRME",
        });
        expect(resultat).toBeNull();
        expect(db.mouvementUpdate).not.toHaveBeenCalled();
    });

    it("n'écrase pas une écriture déjà annulée", async () => {
        db.mouvementFindUnique.mockResolvedValue({ ...ligneBase, annuleParId: "mnt-x" });

        const resultat = await synchroniserMouvementPaiement(prisma, {
            paiement: paiementBase,
            nouveauStatut: "CONFIRME",
        });

        expect(db.mouvementUpdate).not.toHaveBeenCalled();
        expect(resultat?.mouvement.annuleParId).toBe("mnt-x");
    });
});

/* ─── Garde-fou double-comptage (sécurité financière) ───────────────────────── */

interface EcritureMemoire {
    id: string;
    companyId: string;
    compteId: string;
    sens: SensMouvement;
    mode: ModeReglement;
    statut: StatutMouvement;
    montant: string;
    dateOperation: Date;
    dateValeur: Date | null;
    dateEcheance: Date | null;
    cleSource: string | null;
    notes: string | null;
    annuleParId: string | null;
    annuleLe: Date | null;
}

/**
 * Petit ledger en mémoire branché sur les mocks du fichier : il rejoue les
 * séquences d'écriture EXACTES des routes métier et permet d'inspecter l'état
 * final du grand livre tel que `compute.ts` le consommerait.
 */
function installerLedgerEnMemoire(): EcritureMemoire[] {
    const ecritures: EcritureMemoire[] = [];
    let sequence = 0;

    db.mouvementCreate.mockImplementation(async (arg: { data: Record<string, unknown> }) => {
        sequence += 1;
        const ecriture = { ...ligneBase, ...arg.data, id: `mnt-${sequence}` } as unknown as EcritureMemoire;
        ecritures.push(ecriture);
        return ecriture;
    });
    db.mouvementFindUnique.mockImplementation(async (args: { where: { cleSource?: string } }) => {
        const cle = args.where.cleSource ?? null;
        return ecritures.find((e) => e.cleSource === cle) ?? null;
    });
    db.mouvementUpdate.mockImplementation(
        async (args: { where: { id: string }; data: Record<string, unknown> }) => {
            const ecriture = ecritures.find((e) => e.id === args.where.id);
            if (ecriture === undefined) {
                throw new Error("Écriture introuvable");
            }
            Object.assign(ecriture, args.data);
            return ecriture;
        },
    );
    return ecritures;
}

const COMPTE_TEST = { soldeInitial: "0", dateSoldeInitial: new Date("2026-01-01") };

describe("ledger — garde-fou double-comptage (Payment instrumenté vs PREVU de l'instrument)", () => {
    it("effet PAYE : le Payment EN_ATTENTE avec effetId ne DOUBLE PAS le PREVU de l'effet", async () => {
        const ecritures = installerLedgerEnMemoire();

        // 1. `POST /api/effets` : l'effet RECU crée son écriture PREVU
        //    (`app/api/effets/route.ts:109-114`).
        await enregistrerMouvement(prisma, {
            companyId: COMPANY,
            compteType: "BANQUE",
            sens: "ENCAISSEMENT",
            mode: "EFFET",
            statut: "PREVU",
            montant: "1000",
            dateOperation: new Date("2026-02-01"),
            dateEcheance: new Date("2026-03-01"),
            cleSource: cleSourceEffet("e1"),
            effetId: "e1",
        });

        // 2. `PATCH effets/[id] → PAYE` : création du Payment EN_ATTENTE portant
        //    l'effet (`app/api/effets/[id]/route.ts:114`) — le SEUL chemin qui
        //    produit « Payment EN_ATTENTE + effetId non-null ».
        db.effetFindUnique.mockResolvedValue({ type: "RECU", dateEcheance: new Date("2026-03-01") });
        await enregistrerMouvementPourPayment(prisma, {
            ...paiementBase,
            montant: { toString: () => "1000" },
            status: "EN_ATTENTE",
            methode: "EFFET",
            effetId: "e1",
        });

        // 3. MÊME transaction dans la route : le PREVU de l'effet est retiré
        //    (`app/api/effets/[id]/route.ts:145-149`).
        await retirerMouvementPrevu(prisma, {
            companyId: COMPANY,
            cleSource: cleSourceEffet("e1"),
            motif: "effet payé — remplacé par le mouvement du paiement",
        });

        // 4. État au repos : UN SEUL encaissement PREVU, porté par le payment.
        const prevus = ecritures.filter((e) => e.statut === "PREVU" && e.sens === "ENCAISSEMENT");
        expect(prevus).toHaveLength(1);
        expect(prevus[0]?.cleSource).toBe("payment:p1");
        expect(aRecevoir(ecritures).toFixed(3)).toBe("1000.000");
    });

    it("chèque encaissé : le Payment instrumenté remplace le PREVU du chèque (flux compté UNE fois)", async () => {
        const ecritures = installerLedgerEnMemoire();

        // 1. `POST /api/cheques` (RECU) : écriture PREVU `cheque:<id>`
        //    (`app/api/cheques/route.ts:107-122`).
        await enregistrerMouvement(prisma, {
            companyId: COMPANY,
            compteType: "BANQUE",
            sens: "ENCAISSEMENT",
            mode: "CHEQUE",
            statut: "PREVU",
            montant: "500",
            dateOperation: new Date("2026-02-01"),
            cleSource: cleSourceCheque("c1"),
            chequeId: "c1",
        });

        // 2. `POST cheques/[id]/encaisser` : Payment CONFIRME (défaut
        //    `lib/invoice-payment.ts:88`) portant le chèque — c'est le seul
        //    créateur de `Payment.chequeId` (aucun Payment EN_ATTENTE + chequeId
        //    n'est produit par ce chemin).
        db.chequeFindUnique.mockResolvedValue({ type: "RECU", dateEcheance: null });
        await enregistrerMouvementPourPayment(prisma, {
            ...paiementBase,
            montant: { toString: () => "500" },
            methode: "CHEQUE",
            chequeId: "c1",
        });

        // 3. MÊME transaction : retrait du PREVU du chèque
        //    (`app/api/cheques/[id]/encaisser/route.ts:71-75`).
        await retirerMouvementPrevu(prisma, {
            companyId: COMPANY,
            cleSource: cleSourceCheque("c1"),
            motif: "chèque encaissé — remplacé par le mouvement du paiement",
        });

        // 4. Plus aucun PREVU d'encaissement : le flux est REALISE exactement
        //    une fois (solde) et n'apparaît plus dans « à recevoir ».
        expect(aRecevoir(ecritures).toFixed(3)).toBe("0.000");
        expect(soldeReel(COMPTE_TEST, ecritures).toFixed(3)).toBe("500.000");
    });
});
