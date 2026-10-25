export interface DashboardStats {
    chiffreAffaires: string;
    chiffreAffairesVariation: string;
    creancesEnAttente: string;
    creancesFactures: number;
    montantEnRetard: string;
    retardFactures: number;
    tvaDuMois: string;
    totalFactures: number;
    totalFacturesTrimestre: number;
    nouveauxClients: number;
    nouveauxClientsMois: number;
    alertesStock: number;
    devisCount: number;
    devisMontantTotal: string;
    devisTauxConversion: number;
}

export interface ChartDataPoint {
    mois: string;
    ca: number;
    tva: number;
    fodec: number;
    retenue: number;
}

export interface TopClient {
    id: string;
    raisonSociale: string;
    totalCA: string;
}
