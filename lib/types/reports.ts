import type { ChartDataPoint, TopClient } from "./dashboard";

export interface ReportData {
    caAnnuel: string;
    caVariation: string;
    tvaCollectee: string;
    retenuesSubies: string;
    monthlyData: ChartDataPoint[];
    topClients: TopClient[];
    tejXmlPreview: string;
}
