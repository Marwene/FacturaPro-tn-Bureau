"use client";

export interface ExportLineForm {
    id: string;
    ngpCodeId: string;
    ngpCode: string;
    barcode: string;
    snNumero: string;
    quantite: string;
    quantiteBL: string;
    resteQuantite: string;
    bonLivraisonId: string | null;
    bonLivraisonNumero: string;
    dateBL: string;
    invoiceId: string | null;
    invoiceNumero: string;
    dateFact: string;
}

export const emptyLine = (blId = "", blNum = "", blDate = "", snNum = ""): ExportLineForm => ({
    id: crypto.randomUUID(),
    ngpCodeId: "",
    ngpCode: "",
    barcode: "",
    snNumero: snNum,
    quantite: "",
    quantiteBL: "",
    resteQuantite: "",
    bonLivraisonId: blId,
    bonLivraisonNumero: blNum,
    dateBL: blDate,
    invoiceId: null,
    invoiceNumero: "",
    dateFact: "",
});

export interface BLWithVisé {
    id: string;
    numero: string;
    dateCreation: string;
    snNumero: string | null;
    lines: Array<{ id: string; description: string; quantite: string }>;
    invoice?: {
        id: string;
        numero: string;
        dateEmission: string;
    } | null;
}
