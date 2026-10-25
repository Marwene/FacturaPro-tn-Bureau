/**
 * Tests du module PUR de présentation trésorerie — lot D3.2.
 *
 * Jeu repris du D2 « PIVOT AUDIT » (`tresorerie-compute.test.ts`) :
 * 1000 espèces + chèque encaissé 500 − virement 300 − chèque émis 200
 * − effet émis 400 → solde 600.000.
 *
 * Ici on ne recalcule PAS le ledger : on prouve que la COUCHE PRÉSENTATION
 * (colonnes = 5 modes, sens = signe/couleur, statut = prévu/réalisé/annulé)
 * retombe exactement sur ces mêmes chiffres.
 * Aucun accès base, aucun React : presentation.ts est un mapping pur.
 */
import { describe, expect, it } from "vitest";
import Big from "big.js";
import {
    montantTND,
    soldeReel,
    ventilation,
    type CompteTresorerieInput,
    type MouvementTresorerieInput,
    type VentilationMode,
} from "@/lib/tresorerie/compute";
import {
    MODES_TRESORERIE,
    estModeReglement,
    modeDepuisSource,
    presenterLigne,
    presenterLignes,
    presenterRecents,
    presenterVentilationMois,
    statutFluxAffiche,
    type SourceLigne,
} from "@/lib/tresorerie/presentation";
import type {
    ModeReglementTresorerieAffiche,
    TresorerieRecents,
    TresorerieVentilationMode,
} from "@/lib/types/tresorerie";

const compte = (soldeInitial: string, dateSoldeInitial = new Date("2026-01-01")): CompteTresorerieInput => ({
    soldeInitial,
    dateSoldeInitial,
});

const mouvement = (overrides: Partial<MouvementTresorerieInput>): MouvementTresorerieInput => ({
    sens: "ENCAISSEMENT",
    mode: "ESPECES",
    statut: "REALISE",
    montant: "100.000",
    dateOperation: new Date("2026-02-01"),
    dateEcheance: null,
    annuleParId: null,
    ...overrides,
});

/** Jeu PIVOT AUDIT du D2 : les 5 lignes qui doivent retomber sur 600.000. */
const PIVOT_AUDIT: MouvementTresorerieInput[] = [
    mouvement({ sens: "ENCAISSEMENT", mode: "ESPECES", montant: "1000", dateOperation: new Date("2026-02-01") }),
    mouvement({ sens: "ENCAISSEMENT", mode: "CHEQUE", montant: "500", dateOperation: new Date("2026-02-02") }),
    mouvement({ sens: "DECAISSEMENT", mode: "VIREMENT", montant: "300", dateOperation: new Date("2026-02-03") }),
    mouvement({ sens: "DECAISSEMENT", mode: "CHEQUE", montant: "200", dateOperation: new Date("2026-02-04") }),
    mouvement({ sens: "DECAISSEMENT", mode: "EFFET", montant: "400", dateOperation: new Date("2026-02-05") }),
];

const api = (c: VentilationMode): TresorerieVentilationMode => ({
    encaissements: montantTND(c.encaissements),
    decaissements: montantTND(c.decaissements),
    net: montantTND(c.net),
});

/** `ventilation()` (D2) → forme string de `ventilationMois` (réponse `/api/tresorerie`). */
function ventilationMois(mouvements: MouvementTresorerieInput[]): Record<ModeReglementTresorerieAffiche, TresorerieVentilationMode> {
    const v = ventilation(mouvements);
    return {
        ESPECES: api(v.ESPECES),
        CHEQUE: api(v.CHEQUE),
        VIREMENT: api(v.VIREMENT),
        EFFET: api(v.EFFET),
        CARTE: api(v.CARTE),
    };
}

const versSource = (m: MouvementTresorerieInput): SourceLigne[] =>
    m.sens === "ENCAISSEMENT" || m.sens === "DECAISSEMENT"
        ? [{ sens: m.sens, mode: m.mode, montant: m.montant.toString() }]
        : [];

describe("presentation — PIVOT AUDIT D2 (1000 + 500 − 300 − 200 − 400 = 600)", () => {
    it("soldeReel du jeu reste 600.000 (ancrage D2)", () => {
        expect(soldeReel(compte("0"), PIVOT_AUDIT).toFixed(3)).toBe("600.000");
    });

    it("presenterVentilationMois ventile chaque mode dans SA colonne et retombe sur 600", () => {
        const tableau = presenterVentilationMois(ventilationMois(PIVOT_AUDIT));

        expect(tableau.totalEntrees).toBe(1500);
        expect(tableau.totalSorties).toBe(900);
        expect(tableau.solde).toBe(600);

        expect(tableau.cases.ESPECES).toEqual({ entrees: 1000, sorties: 0, net: 1000 });
        expect(tableau.cases.CHEQUE).toEqual({ entrees: 500, sorties: 200, net: 300 });
        expect(tableau.cases.VIREMENT).toEqual({ entrees: 0, sorties: 300, net: -300 });
        expect(tableau.cases.EFFET).toEqual({ entrees: 0, sorties: 400, net: -400 });
        expect(tableau.cases.CARTE).toEqual({ entrees: 0, sorties: 0, net: 0 });

        // La somme des nets par colonne = solde : aucune écriture n'est perdue.
        const sommeNets = MODES_TRESORERIE.reduce((acc, mode) => acc + tableau.cases[mode].net, 0);
        expect(sommeNets).toBe(600);
    });

    it("presenterLignes place chaque mouvement dans la bonne colonne, avec signe et montant signé", () => {
        const { lignes, solde } = presenterLignes(PIVOT_AUDIT.flatMap(versSource));

        expect(solde).toBe(600);
        expect(lignes.map((l) => [l.colonne, l.sens, l.signe])).toEqual([
            ["ESPECES", "entree", "+"],
            ["CHEQUE", "entree", "+"],
            ["VIREMENT", "sortie", "−"],
            ["CHEQUE", "sortie", "−"],
            ["EFFET", "sortie", "−"],
        ]);
        expect(lignes.map((l) => l.montantSigne)).toEqual([1000, 500, -300, -200, -400]);
    });

    it("la ventilation du mois exclut les lignes non réalisées (aucun PREVU dans les totaux)", () => {
        const lignes = [...PIVOT_AUDIT, mouvement({ mode: "CARTE", statut: "PREVU", montant: "999" })];
        expect(presenterVentilationMois(ventilationMois(lignes)).solde).toBe(600);
    });
});

describe("presentation — mapping ligne → colonne / sens / signe", () => {
    it("un encaissement est une entrée signée « + », un décaissement une sortie « − »", () => {
        expect(presenterLigne({ sens: "ENCAISSEMENT", mode: "ESPECES", montant: "250" })).toEqual({
            colonne: "ESPECES",
            sens: "entree",
            signe: "+",
            montant: 250,
            montantSigne: 250,
        });
        expect(presenterLigne({ sens: "DECAISSEMENT", mode: "EFFET", montant: "80" })).toEqual({
            colonne: "EFFET",
            sens: "sortie",
            signe: "−",
            montant: 80,
            montantSigne: -80,
        });
    });

    it("un montant négatif éventuel est présenté en valeur absolue mais reste une sortie", () => {
        const vue = presenterLigne({ sens: "DECAISSEMENT", mode: "CARTE", montant: "-40" });
        expect(vue.montant).toBe(40);
        expect(vue.montantSigne).toBe(-40);
        expect(vue.signe).toBe("−");
    });

    it("les 5 modes sont reconnus, les sources d'échéancier aussi", () => {
        expect(MODES_TRESORERIE).toEqual(["ESPECES", "CHEQUE", "VIREMENT", "EFFET", "CARTE"]);
        for (const mode of MODES_TRESORERIE) expect(estModeReglement(mode)).toBe(true);
        expect(estModeReglement("BITCOIN")).toBe(false);

        expect(modeDepuisSource("effet")).toBe("EFFET");
        expect(modeDepuisSource("cheque")).toBe("CHEQUE");
        expect(modeDepuisSource("virement")).toBe("VIREMENT");
        expect(modeDepuisSource("realise")).toBeNull();
    });
});

describe("presentation — statutFluxAffiche (prévu / réalisé / annulé)", () => {
    it("ramène les statuts métier au trinôme affiché", () => {
        expect(statutFluxAffiche("REALISE")).toBe("realise");
        expect(statutFluxAffiche("CONFIRME")).toBe("realise");
        expect(statutFluxAffiche("ENCAISSE")).toBe("realise");
        expect(statutFluxAffiche("EN_ATTENTE")).toBe("prevu");
        expect(statutFluxAffiche("PREVU")).toBe("prevu");
        expect(statutFluxAffiche("ANNULE")).toBe("annule");
        expect(statutFluxAffiche("REJETE")).toBe("annule");
    });

    it("est insensible à la casse et à la ponctuation des statuts inconnus → prévu", () => {
        expect(statutFluxAffiche(" en_attente ")).toBe("prevu");
        expect(statutFluxAffiche("INCONNU")).toBe("prevu");
    });
});

describe("presentation — presenterRecents (fusion + anti-doublon instrument)", () => {
    const recents = (overrides: Partial<TresorerieRecents> = {}): TresorerieRecents => ({
        paiements: [],
        especes: [],
        virements: [],
        cartes: [],
        effets: [],
        cheques: [],
        pendingCheques: [],
        counts: { paiements: 0, especes: 0, virements: 0, cartes: 0, effets: 0, cheques: 0 },
        ...overrides,
    });

    it("un chèque déjà couvert par le règlement qui le désigne n'apparaît qu'une fois", () => {
        const vue = presenterRecents(recents({
            paiements: [{
                id: "pay-1",
                montant: 500,
                date: "2026-02-02",
                methode: "CHEQUE",
                reference: "REG-1",
                status: "CONFIRME",
                client: "SARL Alpha",
                flux: "entree",
                chequeNumero: "CHQ-9",
                effetNumero: null,
            }],
            cheques: [{
                id: "chq-1",
                montant: 500,
                date: "2026-02-02",
                numero: "CHQ-9",
                type: "RECU",
                status: "ENCAISSE",
                beneficiaire: "SARL Alpha",
            }],
            counts: { paiements: 1, especes: 0, virements: 0, cartes: 0, effets: 0, cheques: 1 },
        }));

        expect(vue.lignes).toHaveLength(1);
        expect(vue.lignes[0].reference).toBe("REG-1");
        expect(vue.lignes[0].statut).toBe("realise");
        expect(vue.tableau.solde).toBe(500);
        expect(vue.tableau.totalSorties).toBe(0);
    });

    it("trie les lignes du plus récent au plus ancien et totalise entrées / sorties / net", () => {
        const vue = presenterRecents(recents({
            paiements: [
                { id: "p-ancien", montant: 100, date: "2026-02-01", methode: "ESPECES", reference: null, status: "CONFIRME", client: "A", flux: "entree", chequeNumero: null, effetNumero: null },
                { id: "p-recent", montant: 60, date: "2026-02-10", methode: "VIREMENT", reference: null, status: "CONFIRME", client: "B", flux: "sortie", chequeNumero: null, effetNumero: null },
            ],
            effets: [
                { id: "e-1", montant: 40, date: "2026-02-05", numero: "EFF-1", type: "EMIS", status: "PAYE", contrepartie: "C" },
            ],
        }));

        expect(vue.lignes.map((l) => l.id)).toEqual(["p-recent", "effet-e-1", "p-ancien"]);
        expect(vue.tableau.totalEntrees).toBe(100);
        expect(vue.tableau.totalSorties).toBe(100);
        expect(vue.tableau.solde).toBe(0);
        expect(vue.lignes.find((l) => l.id === "effet-e-1")?.sens).toBe("sortie");
    });

    it("un panier vide produit un tableau à zéro (pas de NaN)", () => {
        const vue = presenterRecents(recents());
        expect(vue.lignes).toHaveLength(0);
        expect(vue.tableau).toEqual({
            cases: {
                ESPECES: { entrees: 0, sorties: 0, net: 0 },
                CHEQUE: { entrees: 0, sorties: 0, net: 0 },
                VIREMENT: { entrees: 0, sorties: 0, net: 0 },
                EFFET: { entrees: 0, sorties: 0, net: 0 },
                CARTE: { entrees: 0, sorties: 0, net: 0 },
            },
            totalEntrees: 0,
            totalSorties: 0,
            solde: 0,
        });
    });
});

describe("presentation — ventilationMois vide", () => {
    it("une réponse partielle retombe sur des zéros, jamais sur NaN", () => {
        const tableau = presenterVentilationMois({});
        expect(tableau.solde).toBe(0);
        expect(tableau.totalEntrees).toBe(0);
        expect(tableau.totalSorties).toBe(0);
        expect(new Big(tableau.solde).toFixed(3)).toBe("0.000");
    });
});
