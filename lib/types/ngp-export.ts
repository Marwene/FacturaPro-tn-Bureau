import type { ExportStatus } from "./enums";
import type { SerializedTiers } from "./client";

export interface SerializedNgpCode {
    id: string;
    code: string;
    barcode: string | null;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface SerializedExportLine {
    id: string;
    exportId: string;
    bonLivraisonId: string | null;
    invoiceId: string | null;
    ngpCodeId: string | null;
    ngpCode: string | null;
    barcode: string | null;
    snNumero: string | null;
    quantite: string;
    quantiteBL: string | null;
    resteQuantite: string | null;
    bonLivraisonNumero: string | null;
    dateBL: string | null;
    invoiceNumero: string | null;
    dateFact: string | null;
}

export interface SerializedExport {
    id: string;
    numero: string;
    tiersId: string;
    companyId: string | null;
    dateCreation: Date;
    decVente: string | null;
    dateDecVente: string | null;
    simultanee: string | null;
    dateSimultanee: string | null;
    status: ExportStatus;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
    tiers?: SerializedTiers;
    lines?: SerializedExportLine[];
}
