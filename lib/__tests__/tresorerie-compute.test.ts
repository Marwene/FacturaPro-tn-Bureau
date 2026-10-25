/**
 * Tests du module PUR de calcul trésorerie — lot D2.
 * Aucun accès base : compute.ts est purement arithmétique Big.js.
 */
import { describe, expect, it } from "vitest";
import Big from "big.js";
import {
    DECIMALES_TND,
    aPayer,
    aRecevoir,
    arrondiTND,
    bigVersNombre,
    dansFenetreSolde,
    enRetard,
    enRetardParSens,
    estAnnule,
    montantTND,
    previsionnel,
    projectionHebdomadaire,
    soldeReel,
    toBig,
    ventilation,
    type CompteTresorerieInput,
    type MouvementTresorerieInput,
} from "@/lib/tresorerie/compute";
import { paymentStatut, resolveSens } from "@/lib/tresorerie/sens";

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

describe("compute — conversions", () => {
    it("toBig accepte une string et un DecimalLike", () => {
        expect(toBig("12.345").toFixed(3)).toBe("12.345");
        expect(toBig({ toString: () => "6.5" }).toFixed(3)).toBe("6.500");
    });

    it("arrondiTND arrondit à 3 décimales, arrondi commercial (half-up)", () => {
        expect(DECIMALES_TND).toBe(3);
        expect(arrondiTND(new Big("1.0005")).toFixed(3)).toBe("1.001");
        expect(arrondiTND(new Big("1.0004")).toFixed(3)).toBe("1.000");
        // Moins que la demi : jamais arrondi vers le haut.
        expect(arrondiTND(new Big("-1.0005")).toFixed(3)).toBe("-1.001");
    });

    it("montantTND formate canoniquement à 3 décimales", () => {
        expect(montantTND(new Big("600"))).toBe("600.000");
        expect(montantTND(new Big("0.1"))).toBe("0.100");
    });

    it("bigVersNombre ne sert qu'à l'affichage (graphiques)", () => {
        expect(bigVersNombre(new Big("600"))).toBe(600);
        expect(bigVersNombre(new Big("0.0005"))).toBe(0.001);
    });
});

describe("compute — estAnnule (définition unique du repo)", () => {
    it("statut ANNULE → annulé", () => {
        expect(estAnnule(mouvement({ statut: "ANNULE" }))).toBe(true);
    });

    it("REALISE contre-passé (annuleParId renseigné) → annulé", () => {
        expect(estAnnule(mouvement({ statut: "REALISE", annuleParId: "mnt-inverse" }))).toBe(true);
    });

    it("REALISE intact → non annulé", () => {
        expect(estAnnule(mouvement({ statut: "REALISE" }))).toBe(false);
    });
});

describe("compute — dansFenetreSolde", () => {
    it("inclut les opérations à partir de dateSoldeInitial", () => {
        const c = compte("0", new Date("2026-02-01"));
        expect(dansFenetreSolde(mouvement({ dateOperation: new Date("2026-02-01") }), c)).toBe(true);
        expect(dansFenetreSolde(mouvement({ dateOperation: new Date("2026-01-31") }), c)).toBe(false);
    });
});

describe("compute — soldeReel", () => {
    it("additionne les encaissements REALISE et retranche les décaissements", () => {
        const solde = soldeReel(compte("1000"), [
            mouvement({ sens: "ENCAISSEMENT", montant: "500" }),
            mouvement({ sens: "DECAISSEMENT", mode: "CHEQUE", montant: "200" }),
        ]);
        expect(solde.toFixed(3)).toBe("1300.000");
    });

    it("exclut PREVU, ANNULE et A_QUALIFIER (sens ou statut)", () => {
        const solde = soldeReel(compte("0"), [
            mouvement({ statut: "PREVU", montant: "100" }),
            mouvement({ statut: "ANNULE", montant: "100" }),
            mouvement({ statut: "A_QUALIFIER", montant: "100" }),
            mouvement({ sens: "A_QUALIFIER", statut: "REALISE", montant: "100" }),
        ]);
        expect(solde.toFixed(3)).toBe("0.000");
    });

    it("respecte la fenêtre dateSoldeInitial du compte", () => {
        const solde = soldeReel(compte("100", new Date("2026-02-01")), [
            mouvement({ montant: "50", dateOperation: new Date("2026-01-15") }), // avant → exclu
            mouvement({ montant: "70", dateOperation: new Date("2026-02-10") }), // après → inclus
        ]);
        expect(solde.toFixed(3)).toBe("170.000");
    });

    it("une origine contre-passée et son inverse REALISE se compensent exactement", () => {
        const origine = mouvement({
            sens: "ENCAISSEMENT",
            montant: "1000",
            annuleParId: "mnt-inverse",
        });
        const inverse = mouvement({
            sens: "DECAISSEMENT",
            montant: "1000",
            dateOperation: new Date("2026-02-05"),
        });
        expect(soldeReel(compte("0"), [origine, inverse]).toFixed(3)).toBe("0.000");
    });

    it("PIVOT : encaissement 1000 contre-passé puis encaissement 600 → solde = 600", () => {
        const lignes: MouvementTresorerieInput[] = [
            // Écriture originale : reste REALISE (contre-passation pure, règle D1).
            mouvement({
                sens: "ENCAISSEMENT",
                mode: "VIREMENT",
                montant: "1000",
                dateOperation: new Date("2026-02-01"),
                annuleParId: "mnt-inverse",
            }),
            // Écriture inverse REALISE au sens opposé, datée de l'annulation.
            mouvement({
                sens: "DECAISSEMENT",
                mode: "VIREMENT",
                montant: "1000",
                dateOperation: new Date("2026-02-05"),
            }),
            // Nouvel encaissement réalisé.
            mouvement({
                sens: "ENCAISSEMENT",
                mode: "ESPECES",
                montant: "600",
                dateOperation: new Date("2026-02-10"),
            }),
            // Une échéance prévue ne doit pas influencer le solde réalisé.
            mouvement({
                sens: "ENCAISSEMENT",
                mode: "CHEQUE",
                statut: "PREVU",
                montant: "999",
                dateOperation: new Date("2026-02-11"),
            }),
        ];
        expect(soldeReel(compte("0"), lignes).toFixed(3)).toBe("600.000");
    });

    it("PIVOT AUDIT : 1000 espèces + chèque reçu 500 encaissé − virement 300 − chèque émis 200 − effet émis 400 → solde = 600", () => {
        const lignes: MouvementTresorerieInput[] = [
            // 1. encaissement client 1000 en espèces → +1000
            mouvement({ sens: "ENCAISSEMENT", mode: "ESPECES", montant: "1000", dateOperation: new Date("2026-02-01") }),
            // 2. chèque reçu 500, encaissé (REALISE) → +500
            mouvement({ sens: "ENCAISSEMENT", mode: "CHEQUE", montant: "500", dateOperation: new Date("2026-02-02") }),
            // 3. virement fournisseur 300 → −300
            mouvement({ sens: "DECAISSEMENT", mode: "VIREMENT", montant: "300", dateOperation: new Date("2026-02-03") }),
            // 4. chèque émis 200, débité → −200
            mouvement({ sens: "DECAISSEMENT", mode: "CHEQUE", montant: "200", dateOperation: new Date("2026-02-04") }),
            // 5. effet émis 400, payé → −400
            mouvement({ sens: "DECAISSEMENT", mode: "EFFET", montant: "400", dateOperation: new Date("2026-02-05") }),
        ];
        // Prouve que les DÉCAISSEMENTS retranchent bien (l'ancien bug Σ Payment
        // sans signe les AJOUTAIT : 1000+500+300+200+400 = 2400).
        // Ici : 1000 + 500 − 300 − 200 − 400 = 600.
        expect(soldeReel(compte("0"), lignes).toFixed(3)).toBe("600.000");
    });
});

describe("compute — aRecevoir / aPayer / previsionnel", () => {
    it("aRecevoir somme les PREVU d'encaissement uniquement", () => {
        const total = aRecevoir([
            mouvement({ statut: "PREVU", sens: "ENCAISSEMENT", montant: "300" }),
            mouvement({ statut: "PREVU", sens: "DECAISSEMENT", montant: "300" }),
            mouvement({ statut: "REALISE", sens: "ENCAISSEMENT", montant: "300" }),
        ]);
        expect(total.toFixed(3)).toBe("300.000");
    });

    it("RÈGLE FIGÉE : aRecevoir inclut les paiements EN_ATTENTE (arbitrage utilisateur 2026-10-16)", () => {
        // Règle arbitrée par l'utilisateur le 2026-10-16 : un virement annoncé
        // et saisi (Payment EN_ATTENTE → mouvement PREVU ENCAISSEMENT via
        // paymentStatut) est de l'argent attendu — l'EXCLURE de `aRecevoir`
        // CACHERAIT un argent annoncé au dirigeant. Ne pas « corriger » ce test
        // vers l'exclusion sans un nouvel arbitrage explicite de l'utilisateur.
        const statutAttendu = paymentStatut("EN_ATTENTE");
        expect(statutAttendu.statut).toBe("PREVU");

        const total = aRecevoir([
            mouvement({
                statut: statutAttendu.statut,
                sens: "ENCAISSEMENT",
                mode: "VIREMENT",
                montant: "450",
            }),
        ]);
        expect(total.toFixed(3)).toBe("450.000");
    });

    it("aPayer somme les PREVU de décaissement uniquement", () => {
        const total = aPayer([
            mouvement({ statut: "PREVU", sens: "DECAISSEMENT", montant: "120.505" }),
            mouvement({ statut: "PREVU", sens: "ENCAISSEMENT", montant: "999" }),
        ]);
        expect(total.toFixed(3)).toBe("120.505");
    });

    it("previsionnel = solde + à recevoir − à payer", () => {
        expect(previsionnel(new Big("600"), new Big("100"), new Big("250")).toFixed(3)).toBe("450.000");
    });
});

describe("compute — enRetard", () => {
    const aujourdhui = new Date("2026-02-10T12:00:00Z");

    it("compte les PREVU dont l'échéance est passée, quel que soit le sens", () => {
        const total = enRetard([
            mouvement({ statut: "PREVU", dateEcheance: new Date("2026-02-01"), montant: "40" }),
            mouvement({ statut: "PREVU", sens: "DECAISSEMENT", dateEcheance: new Date("2026-02-05"), montant: "60" }),
        ], aujourdhui);
        expect(total.toFixed(3)).toBe("100.000");
    });

    it("ignore les échéances futures, les écritures sans échéance et les non-PREVU", () => {
        const total = enRetard([
            mouvement({ statut: "PREVU", dateEcheance: new Date("2026-03-01"), montant: "40" }),
            mouvement({ statut: "PREVU", dateEcheance: null, montant: "40" }),
            mouvement({ statut: "REALISE", dateEcheance: new Date("2026-02-01"), montant: "40" }),
        ], aujourdhui);
        expect(total.toFixed(3)).toBe("0.000");
    });

    it("enRetardParSens ventile entrées / sorties", () => {
        const ventile = enRetardParSens([
            mouvement({ statut: "PREVU", dateEcheance: new Date("2026-02-01"), montant: "30" }),
            mouvement({ statut: "PREVU", sens: "DECAISSEMENT", dateEcheance: new Date("2026-02-02"), montant: "70" }),
        ], aujourdhui);
        expect(ventile.entrees.toFixed(3)).toBe("30.000");
        expect(ventile.sorties.toFixed(3)).toBe("70.000");
    });
});

describe("compute — ventilation", () => {
    it("ventile REALISE par mode ET par sens (5 modes, EFFET inclus)", () => {
        const v = ventilation([
            mouvement({ mode: "ESPECES", montant: "100" }),
            mouvement({ mode: "ESPECES", sens: "DECAISSEMENT", montant: "40" }),
            mouvement({ mode: "EFFET", montant: "250" }),
            mouvement({ mode: "CHEQUE", sens: "DECAISSEMENT", montant: "60" }),
        ]);
        expect(v.ESPECES.encaissements.toFixed(3)).toBe("100.000");
        expect(v.ESPECES.decaissements.toFixed(3)).toBe("40.000");
        expect(v.ESPECES.net.toFixed(3)).toBe("60.000");
        expect(v.EFFET.encaissements.toFixed(3)).toBe("250.000");
        expect(v.CHEQUE.decaissements.toFixed(3)).toBe("60.000");
        expect(v.VIREMENT.net.toFixed(3)).toBe("0.000");
        expect(v.CARTE.net.toFixed(3)).toBe("0.000");
    });

    it("exclut les lignes A_QUALIFIER et les statuts hors filtre", () => {
        const v = ventilation([
            mouvement({ sens: "A_QUALIFIER", montant: "100" }),
            mouvement({ statut: "PREVU", montant: "100" }),
        ]);
        expect(v.ESPECES.encaissements.toFixed(3)).toBe("0.000");
    });

    it("respecte la fenêtre debut/fin (bornes inclusives)", () => {
        const v = ventilation([
            mouvement({ montant: "10", dateOperation: new Date("2026-02-01") }),
            mouvement({ montant: "20", dateOperation: new Date("2026-02-28T23:59:59") }),
            mouvement({ montant: "40", dateOperation: new Date("2026-03-01") }),
        ], { debut: new Date("2026-02-01"), fin: new Date("2026-02-28T23:59:59") });
        expect(v.ESPECES.encaissements.toFixed(3)).toBe("30.000");
    });

    it("un effet n'apparaît JAMAIS dans les virements : les 5 modes sont des bacs distincts", () => {
        const v = ventilation([
            mouvement({ mode: "EFFET", montant: "400" }), // encaissement d'effet
            mouvement({ mode: "EFFET", sens: "DECAISSEMENT", montant: "150" }), // décaissement d'effet
            mouvement({ mode: "VIREMENT", montant: "250" }), // seul vrai virement
        ]);
        // L'effet atterrit dans SON bac...
        expect(v.EFFET.encaissements.toFixed(3)).toBe("400.000");
        expect(v.EFFET.decaissements.toFixed(3)).toBe("150.000");
        expect(v.EFFET.net.toFixed(3)).toBe("250.000");
        // ...et JAMAIS dans la colonne « virements », qui ne contient que le virement réel.
        expect(v.VIREMENT.encaissements.toFixed(3)).toBe("250.000");
        expect(v.VIREMENT.decaissements.toFixed(3)).toBe("0.000");
        expect(v.VIREMENT.net.toFixed(3)).toBe("250.000");
    });
});

describe("compute — projectionHebdomadaire", () => {
    const debut = new Date("2026-02-09T00:00:00Z"); // lundi

    it("répartit les échéances par semaine et cumule le solde", () => {
        const semaines = projectionHebdomadaire({
            soldeDepart: new Big("1000"),
            mouvements: [
                mouvement({ statut: "PREVU", dateEcheance: new Date("2026-02-11"), montant: "100" }), // S1
                mouvement({ statut: "PREVU", sens: "DECAISSEMENT", dateEcheance: new Date("2026-02-20"), montant: "300" }), // S2
            ],
            debut,
            jours: 21,
        });
        expect(semaines).toHaveLength(3);
        expect(semaines[0].entrees.toFixed(3)).toBe("100.000");
        expect(semaines[0].soldeEstime.toFixed(3)).toBe("1100.000");
        expect(semaines[1].sorties.toFixed(3)).toBe("300.000");
        expect(semaines[1].soldeEstime.toFixed(3)).toBe("800.000");
        expect(semaines[2].soldeEstime.toFixed(3)).toBe("800.000");
    });

    it("les échéances DÉJÀ EN RETARD sont comptées en semaine 1 (jamais perdues)", () => {
        const semaines = projectionHebdomadaire({
            soldeDepart: new Big("0"),
            mouvements: [
                mouvement({ statut: "PREVU", dateEcheance: new Date("2026-01-01"), montant: "55" }),
            ],
            debut,
            jours: 14,
        });
        expect(semaines[0].entrees.toFixed(3)).toBe("55.000");
    });

    it("ignore les échéances hors horizon, les non-PREVU et les écritures sans échéance", () => {
        const semaines = projectionHebdomadaire({
            soldeDepart: new Big("0"),
            mouvements: [
                mouvement({ statut: "PREVU", dateEcheance: new Date("2027-01-01"), montant: "999" }),
                mouvement({ statut: "REALISE", dateEcheance: new Date("2026-02-10"), montant: "999" }),
                mouvement({ statut: "PREVU", dateEcheance: null, montant: "999" }),
            ],
            debut,
            jours: 7,
        });
        expect(semaines).toHaveLength(1);
        expect(semaines[0].entrees.toFixed(3)).toBe("0.000");
        expect(semaines[0].sorties.toFixed(3)).toBe("0.000");
    });

    it("garantit au moins une semaine même pour un horizon < 7 jours", () => {
        const semaines = projectionHebdomadaire({
            soldeDepart: new Big("0"),
            mouvements: [],
            debut,
            jours: 1,
        });
        expect(semaines).toHaveLength(1);
    });
});

describe("compute — un chèque émis n'augmente JAMAIS le solde", () => {
    it("PREVU → dans à payer (jamais dans le solde réalisé) ; REALISE → retranché du solde", () => {
        const chequeEmisPrevu = mouvement({ sens: "DECAISSEMENT", mode: "CHEQUE", statut: "PREVU", montant: "200" });
        // Prévu : comptabilisé en encours à payer, ABSENT du solde réalisé.
        expect(aPayer([chequeEmisPrevu]).toFixed(3)).toBe("200.000");
        expect(soldeReel(compte("1000"), [chequeEmisPrevu]).toFixed(3)).toBe("1000.000");

        // Débité (REALISE) : il retranche — il n'augmente jamais le solde.
        const chequeEmisRealise = mouvement({ sens: "DECAISSEMENT", mode: "CHEQUE", statut: "REALISE", montant: "200" });
        expect(soldeReel(compte("1000"), [chequeEmisRealise]).toFixed(3)).toBe("800.000");
    });

    it("un chèque EMIS ne peut aboutir à un ENCAISSEMENT (resolveSens, toutes combinaisons de documents)", () => {
        const combinaisons: Array<{ invoiceId: string | null; achatId: string | null; avoirId: string | null }> = [
            { invoiceId: "inv-1", achatId: null, avoirId: null }, // facture seule → contradictoire
            { invoiceId: "inv-1", achatId: "ach-1", avoirId: null }, // facture + achat → contradictoire
            { invoiceId: null, achatId: "ach-1", avoirId: null }, // achat seul → décaissement
            { invoiceId: null, achatId: null, avoirId: "av-1" }, // avoir seul
            { invoiceId: null, achatId: null, avoirId: null }, // aucune source de direction
        ];
        for (const { invoiceId, achatId, avoirId } of combinaisons) {
            const resolution = resolveSens({ chequeType: "EMIS", effetType: null, invoiceId, achatId, avoirId });
            // Un chèque émis est un DÉCAISSEMENT (ou A_QUALIFIER) : il ne devient
            // jamais un ENCAISSEMENT, quelle que soit la source documentaire.
            expect(resolution.sens).not.toBe("ENCAISSEMENT");
        }
    });
});
