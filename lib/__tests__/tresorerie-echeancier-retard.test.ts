/**
 * Test de route — correctif de clôture du lot D3.1 (défaut T-6, audit §5.5).
 *
 * Défaut corrigé : les deux requêtes d'échéancier de `GET /api/tresorerie`
 * appliquaient `dateEcheance: { gte: now, lte: horizon }`. Les échéances
 * PASSÉES encore non soldées étaient donc absentes du détail alors que
 * `solde.enRetard` les totalise (`enRetard()` de `lib/tresorerie/compute.ts`,
 * sans borne basse) → KPI et détail désynchronisés (onglet « En retard »).
 *
 * Correctif : plus de borne basse, `lte: horizon` conservé.
 * Ce fichier prouve, sur la ROUTE réelle (handler importé, session signée,
 * Prisma mocké avec la sémantique des filtres) :
 *  1. une échéance passée toujours PREVU totalise dans `solde.enRetard`
 *     ET apparaît comme ligne de `echeancier` (le front la classe alors en
 *     retard, règle reprise de `components/paiements/tresorerie-echeances.tsx`) ;
 *  2. le `where` envoyé à Prisma n'a plus de borne `gte` (régession = échec) ;
 *  3. le paramètre `compte` (lot D3.1) filtre toujours ces lignes via
 *     `filtreInstrument` (`mouvementsTresorerie.some.compte.type`).
 *
 * Aucun accès base, aucun front : le harness reprend `tresorerie-effets-escompte.test.ts`.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Prisma est instancié à l'import de lib/prisma.ts (DATABASE_URL requise) :
// le module est mocké entièrement (vi.mock est hoisté au-dessus des imports).
const db = vi.hoisted(() => ({
    compteFindMany: vi.fn(),
    mouvementFindMany: vi.fn(),
    chequeFindMany: vi.fn(),
    effetFindMany: vi.fn(),
    paymentFindMany: vi.fn(),
    paymentGroupBy: vi.fn(),
    effetCount: vi.fn(),
    chequeCount: vi.fn(),
    userFindUnique: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
    prisma: {
        compteTresorerie: { findMany: db.compteFindMany },
        mouvementTresorerie: { findMany: db.mouvementFindMany },
        cheque: { findMany: db.chequeFindMany, count: db.chequeCount },
        effet: { findMany: db.effetFindMany, count: db.effetCount },
        payment: { findMany: db.paymentFindMany, groupBy: db.paymentGroupBy },
        user: { findUnique: db.userFindUnique },
    },
}));

import { GET as GetTresorerie } from "@/app/api/tresorerie/route";
import { statutFluxAffiche } from "@/lib/tresorerie/presentation";
import { encodeSessionToken, SESSION_COOKIE_NAME } from "@/lib/session-token";
import { clearUserSessionCache } from "@/lib/session-cache";
import type { TresorerieData, TresorerieEcheancierLigne } from "@/lib/types/tresorerie";

process.env.AUTH_SECRET = "secret-test-echeancier-retard";

const COMPANY_A = "company-a";
const JOUR = 24 * 60 * 60 * 1000;
const PASSEE_15J = new Date(Date.now() - 15 * JOUR);
const PASSEE_40J = new Date(Date.now() - 40 * JOUR);
const FUTURE_10J = new Date(Date.now() + 10 * JOUR);

/** Requête authentifiée en tant qu'ADMIN de la société A (session réelle signée). */
async function authedRequest(url: string): Promise<NextRequest> {
    const token = await encodeSessionToken(
        {
            emailVerified: null,
            id: "user-a",
            role: "ADMIN",
            companyId: COMPANY_A,
            permissions: [],
            allowedCompanyIds: [COMPANY_A],
            lastActivity: Date.now(),
            rememberMe: true,
        },
        SESSION_COOKIE_NAME,
    );
    return new NextRequest(url, { method: "GET", headers: { cookie: `${SESSION_COOKIE_NAME}=${token}` } });
}

const noParams = (): { params: Promise<Record<string, string>> } => ({
    params: Promise.resolve({}),
});

/* ─── Fixtures ───────────────────────────────────────────────────────────── */

interface CompteFixture {
    id: string;
    companyId: string;
    type: "CAISSE" | "BANQUE";
    libelle: string;
    soldeInitial: string;
    dateSoldeInitial: Date;
}

interface MouvementFixture {
    id: string;
    companyId: string;
    compteId: string;
    compteType: "CAISSE" | "BANQUE";
    sens: "ENCAISSEMENT" | "DECAISSEMENT" | "A_QUALIFIER";
    mode: "ESPECES" | "CHEQUE" | "VIREMENT" | "EFFET" | "CARTE";
    statut: "PREVU" | "REALISE" | "ANNULE" | "A_QUALIFIER";
    montant: string;
    dateOperation: Date;
    dateEcheance: Date | null;
    annuleParId: string | null;
    invoiceId: string | null;
    achatId: string | null;
}

interface ChequeFixture {
    id: string;
    companyId: string;
    compteType: "CAISSE" | "BANQUE";
    numero: string;
    type: "RECU" | "EMIS";
    beneficiaire: string;
    montant: string;
    status: string;
    dateEcheance: Date;
    createdAt: Date;
    tiers: { raisonSociale: string } | null;
}

interface EffetFixture {
    id: string;
    companyId: string;
    compteType: "CAISSE" | "BANQUE";
    numero: string;
    type: "RECU" | "EMIS";
    tire: string;
    montant: string;
    status: string;
    dateEcheance: Date;
    ordrePaiementNumero: string | null;
    createdAt: Date;
    tireur: { raisonSociale: string } | null;
    fournisseur: { raisonSociale: string } | null;
}

/** Forme des `where` envoyés par la route aux modèles instrument (cheque/effet). */
interface WhereInstrument {
    companyId?: string;
    status?: string | { notIn: string[] };
    dateEcheance?: { gte?: Date; lte?: Date };
    createdAt?: { gte?: Date };
    mouvementsTresorerie?: { some: { compte: { type: string } } };
}

const COMPTES: CompteFixture[] = [
    {
        id: "c-caisse",
        companyId: COMPANY_A,
        type: "CAISSE",
        libelle: "Caisse",
        soldeInitial: "0.000",
        dateSoldeInitial: new Date("2020-01-01"),
    },
    {
        id: "c-banque",
        companyId: COMPANY_A,
        type: "BANQUE",
        libelle: "Banque",
        soldeInitial: "0.000",
        dateSoldeInitial: new Date("2020-01-01"),
    },
];

/** 2 échéances PREVU passées : chèque reçu 500 + effet émis 300 → en retard 800. */
const MOUVEMENTS: MouvementFixture[] = [
    {
        id: "mnt-cheque",
        companyId: COMPANY_A,
        compteId: "c-banque",
        compteType: "BANQUE",
        sens: "ENCAISSEMENT",
        mode: "CHEQUE",
        statut: "PREVU",
        montant: "500.000",
        dateOperation: PASSEE_40J,
        dateEcheance: PASSEE_15J,
        annuleParId: null,
        invoiceId: "inv-1",
        achatId: null,
    },
    {
        id: "mnt-effet",
        companyId: COMPANY_A,
        compteId: "c-banque",
        compteType: "BANQUE",
        sens: "DECAISSEMENT",
        mode: "EFFET",
        statut: "PREVU",
        montant: "300.000",
        dateOperation: PASSEE_40J,
        dateEcheance: PASSEE_15J,
        annuleParId: null,
        invoiceId: null,
        achatId: "achat-1",
    },
];

const CHEQUES: ChequeFixture[] = [
    {
        id: "chq-retard",
        companyId: COMPANY_A,
        compteType: "BANQUE",
        numero: "CHQ-001",
        type: "RECU",
        beneficiaire: "Ben Salah",
        montant: "500.000",
        status: "EN_ATTENTE",
        dateEcheance: PASSEE_15J,
        createdAt: PASSEE_40J,
        tiers: { raisonSociale: "Ben Salah" },
    },
    {
        id: "chq-futur",
        companyId: COMPANY_A,
        compteType: "BANQUE",
        numero: "CHQ-002",
        type: "EMIS",
        beneficiaire: "Fournisseur Y",
        montant: "250.000",
        status: "EN_ATTENTE",
        dateEcheance: FUTURE_10J,
        createdAt: PASSEE_40J,
        tiers: null,
    },
];

const EFFETS: EffetFixture[] = [
    {
        id: "eff-retard",
        companyId: COMPANY_A,
        compteType: "BANQUE",
        numero: "EFF-001",
        type: "EMIS",
        tire: "Fournisseur Y",
        montant: "300.000",
        status: "EN_PORTEFEUILLE",
        dateEcheance: PASSEE_15J,
        ordrePaiementNumero: "OP-001",
        createdAt: PASSEE_40J,
        tireur: null,
        fournisseur: { raisonSociale: "Fournisseur Y" },
    },
];

/** Applique au fixture le sous-ensemble de sémantique Prisma utilisé par la route. */
function filtreInstrument(row: { companyId: string; compteType: string; status: string; dateEcheance?: Date; createdAt: Date }, where: WhereInstrument): boolean {
    if (where.companyId !== undefined && row.companyId !== where.companyId) return false;
    const statut = where.status;
    if (typeof statut === "string") {
        if (row.status !== statut) return false;
    } else if (statut !== undefined) {
        if (statut.notIn.includes(row.status)) return false;
    }
    const fenetreEcheance = where.dateEcheance;
    if (fenetreEcheance !== undefined && row.dateEcheance !== undefined) {
        // Régression possible ici : si `gte` réapparaît, l'échéance passée est écartée
        // et les tests 1 et 2 échouent.
        if (fenetreEcheance.gte !== undefined && row.dateEcheance < fenetreEcheance.gte) return false;
        if (fenetreEcheance.lte !== undefined && row.dateEcheance > fenetreEcheance.lte) return false;
    }
    if (where.createdAt?.gte !== undefined && row.createdAt < where.createdAt.gte) return false;
    const typeCompte = where.mouvementsTresorerie?.some.compte.type;
    if (typeCompte !== undefined && row.compteType !== typeCompte) return false;
    return true;
}

beforeEach(() => {
    clearUserSessionCache();
    for (const fn of Object.values(db)) fn.mockReset();
    db.userFindUnique.mockResolvedValue({ actif: true, role: "ADMIN", permissions: [] });

    db.compteFindMany.mockImplementation(
        async (args: { where: { companyId?: string; type?: string } }): Promise<CompteFixture[]> =>
            COMPTES.filter((c) => args.where.type === undefined || c.type === args.where.type),
    );
    db.mouvementFindMany.mockImplementation(
        async (args: { where: { companyId?: string; compte?: { type?: string } } }): Promise<MouvementFixture[]> =>
            MOUVEMENTS.filter(
                (m) => args.where.compte?.type === undefined || m.compteType === args.where.compte.type,
            ),
    );
    db.chequeFindMany.mockImplementation(
        async (args: { where: WhereInstrument; take?: number }): Promise<ChequeFixture[]> => {
            const lignes = CHEQUES.filter((c) => filtreInstrument(c, args.where));
            return args.take === undefined ? lignes : lignes.slice(0, args.take);
        },
    );
    db.effetFindMany.mockImplementation(
        async (args: { where: WhereInstrument; take?: number }): Promise<EffetFixture[]> => {
            const lignes = EFFETS.filter((e) => filtreInstrument(e, args.where));
            return args.take === undefined ? lignes : lignes.slice(0, args.take);
        },
    );
    db.paymentFindMany.mockResolvedValue([]);
    db.paymentGroupBy.mockResolvedValue([]);
    db.effetCount.mockResolvedValue(0);
    db.chequeCount.mockResolvedValue(0);
});

/** Règle de classement du front (identique à `estEnRetard` de tresorerie-echeances.tsx). */
const startOfDay = (valeur: Date): Date => new Date(valeur.getFullYear(), valeur.getMonth(), valeur.getDate());
const estEnRetardCoteClient = (ligne: TresorerieEcheancierLigne): boolean =>
    new Date(ligne.date).getTime() < startOfDay(new Date()).getTime() &&
    statutFluxAffiche(ligne.status) === "prevu";

describe("GET /api/tresorerie — échéances passées encore PREVU (correctif T-6)", () => {
    it("totalise l'échéance passée dans solde.enRetard ET la renvoie dans echeancier (KPI ↔ détail)", async () => {
        const res = await GetTresorerie(await authedRequest("http://localhost/api/tresorerie"), noParams());
        expect(res.status).toBe(200);
        const data: TresorerieData = await res.json();

        // KPI : les 2 échéances PREVU passées (500 encaissement + 300 décaissement).
        expect(data.solde.enRetard).toBe("800.000");

        // Détail : les 2 lignes sont présentes (plus aucune borne basse `gte: now`).
        const ids = data.echeancier.map((ligne) => ligne.id);
        expect(ids).toContain("chq-retard");
        expect(ids).toContain("eff-retard");
        expect(ids).toContain("chq-futur");

        // Le front les classe en retard avec SA règle (date < aujourd'hui && statut prévu).
        const lignesRetard = data.echeancier.filter(estEnRetardCoteClient);
        expect(lignesRetard.map((l) => l.id).sort()).toEqual(["chq-retard", "eff-retard"]);
        const totalDetail = lignesRetard.reduce((somme, ligne) => somme + ligne.montant, 0);
        expect(totalDetail.toFixed(3)).toBe(data.solde.enRetard);

        // La sérialisation reste celle de TresorerieEcheancierLigne (statut métier brut).
        const cheque = data.echeancier.find((ligne) => ligne.id === "chq-retard");
        expect(cheque).toMatchObject({
            source: "cheque",
            status: "EN_ATTENTE",
            montant: 500,
            chequeId: "chq-retard",
            numero: "CHQ-001",
        });
        expect(new Date(cheque?.date ?? 0).getTime()).toBe(PASSEE_15J.getTime());
    });

    it("envoie un where dateEcheance SANS borne basse (lte: horizon uniquement) aux 2 requêtes d'échéancier", async () => {
        await GetTresorerie(await authedRequest("http://localhost/api/tresorerie"), noParams());

        const appels = db.chequeFindMany.mock.calls;
        const whereCheque = appels
            .map((appel) => (appel[0] as { where: WhereInstrument }).where)
            .find((where) => where.status === "EN_ATTENTE");
        expect(whereCheque).toBeDefined();
        expect(whereCheque?.dateEcheance).toBeDefined();
        expect(whereCheque?.dateEcheance).not.toHaveProperty("gte");
        expect(whereCheque?.dateEcheance?.lte).toBeInstanceOf(Date);

        const whereEffet = db.effetFindMany.mock.calls
            .map((appel) => (appel[0] as { where: WhereInstrument }).where)
            .find((where) => typeof where.status === "object" && where.status !== null);
        expect(whereEffet).toBeDefined();
        expect(whereEffet?.dateEcheance).not.toHaveProperty("gte");
        expect(whereEffet?.dateEcheance?.lte).toBeInstanceOf(Date);
    });

    it("le paramètre `compte` filtre toujours ces lignes via filtreInstrument", async () => {
        // Sans filtre : les 2 instruments (rattachés à la BANQUE) sont visibles.
        const sansFiltre: TresorerieData = await (
            await GetTresorerie(await authedRequest("http://localhost/api/tresorerie"), noParams())
        ).json();
        expect(sansFiltre.echeancier.map((l) => l.id).sort()).toEqual(["chq-futur", "chq-retard", "eff-retard"]);
        expect(sansFiltre.parCompte.map((c) => c.type).sort()).toEqual(["BANQUE", "CAISSE"]);

        // ?compte=CAISSE : instruments rattachés à la BANQUE écartés, agrégats cohérents.
        const caisse: TresorerieData = await (
            await GetTresorerie(
                await authedRequest("http://localhost/api/tresorerie?compte=CAISSE"),
                noParams(),
            )
        ).json();
        expect(caisse.echeancier).toEqual([]);
        expect(caisse.solde.enRetard).toBe("0.000");
        expect(caisse.parCompte.map((c) => c.type)).toEqual(["CAISSE"]);

        const whereCheque = db.chequeFindMany.mock.calls
            .map((appel) => (appel[0] as { where: WhereInstrument }).where)
            .find((where) => where.mouvementsTresorerie !== undefined);
        expect(whereCheque?.mouvementsTresorerie?.some.compte.type).toBe("CAISSE");
    });

    it("?compte= invalide → 422 { error, issues } (contrat D3.1)", async () => {
        const res = await GetTresorerie(
            await authedRequest("http://localhost/api/tresorerie?compte=CAISSE_ET_BANQUE"),
            noParams(),
        );
        expect(res.status).toBe(422);
        const body: { error: string; issues: unknown[] } = await res.json();
        expect(typeof body.error).toBe("string");
        expect(Array.isArray(body.issues)).toBe(true);
        expect(body.issues.length).toBeGreaterThan(0);
    });
});
