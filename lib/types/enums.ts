export type InvoiceStatus =
    | "BROUILLON"
    | "ENVOYEE"
    | "PARTIELLE"
    | "PAYEE"
    | "EN_RETARD"
    | "ANNULEE";

export type QuoteStatus =
    | "BROUILLON"
    | "ENVOYEE"
    | "ACCEPTEE"
    | "REFUSEE"
    | "EXPIREE"
    | "FACTUREE";

export type ChequeType = "RECU" | "EMIS";
export type ChequeStatus = "EN_ATTENTE" | "ENCAISSE" | "REJETE" | "ANNULE";
export type PaymentMethod = "ESPECES" | "VIREMENT" | "CARTE" | "CHEQUE" | "EFFET";
export type StockStatus = "OK" | "CRITIQUE" | "RUPTURE";
export type DeliveryNoteStatus = "BROUILLON" | "LIVRE" | "ANNULE";
export type AchatStatus = "BROUILLON" | "VALIDEE" | "ANNULEE";
export type AchatType = "BL" | "FACTURE";
export type AchatCategorie = "MATIERES_PREMIERES" | "TENUES_TRAVAIL" | "DIVERS";
export type MouvementType = "ENTREE" | "SORTIE" | "AJUSTEMENT";
export type BonCommandeStatus = "BROUILLON" | "ACCEPTE" | "ANNULE";
export type ExportStatus = "BROUILLON" | "EN_COURS" | "VALIDE" | "ANNULE";
export type AvoirStatus = "BROUILLON" | "EMIS" | "REMBOURSE" | "ANNULE";
export type MouvementFinancierType = "DEBIT" | "CREDIT";
export type AvoirType = "SIMPLE" | "FINANCIER";
export type EffetStatus = "EN_PORTEFEUILLE" | "REMIS_ESCOMPTE" | "ENDOSSE" | "IMPAYE" | "PAYE" | "ANNULE";
export type EffetType = "RECU" | "EMIS";
export type OrdreFabricationStatus = "BROUILLON" | "CONFIRME" | "EN_COURS" | "TERMINE" | "ANNULE";
export type RapprochementStatus = "RECONCILIE" | "EN_ATTENTE" | "ECART";
export type DesignStatutStatus = "BROUILLON" | "VALIDE" | "PRODUCTION";
export type PackingListStatus = "GENERE" | "VALIDE";
