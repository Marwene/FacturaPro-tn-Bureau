export interface SerializedSettings {
    id: string;
    raisonSociale: string;
    matriculeFiscal: string;
    adresse: string;
    ville: string;
    codePostal: string;
    telephone: string;
    email: string;
    siteWeb: string;
    ribBancaire: string;
    banque: string;
    tauxTVADefaut: string;
    tauxFodecDefaut: string;
    prefixeFacture: string;
    prefixeDevis: string;
    prefixeBL: string;
    anneeFormat: boolean;
    alerteStockActif: boolean;
    alerteEcheanceJours: number;
    updatedAt: Date;
}
