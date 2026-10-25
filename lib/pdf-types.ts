export type DocumentLine = {
  code: string;
  desc: string;
  qty: number;
  price: number;
  tva: number;
  fodec: boolean;
  blNumero?: string;
  blDate?: string;
  isGroupHeader?: boolean;
};

export type DocumentPDFOptions = {
  docType: string;
  docNumber: string;
  topRightLines?: string[];
  party: { title: string; name: string; lines?: string[] };
  lines: DocumentLine[];
  totals: {
    subtotal: number;
    remise?: number;
    fodec: number;
    tva: number;
    stamp: number;
    total: number;
    extras?: { label: string; value: number; emphasis?: "success" | "danger" }[];
  };
  notes?: string;
  devise?: string;
  tauxChange?: string;
  bcVise?: {
    numero?: string;
    date?: string;
    poids?: string;
    poidsBrut?: string;
    nbColis?: number;
    devise?: string;
    tauxChange?: string;
    montantTND?: string;
  };
  company?: {
    name?: string;
    tagline?: string;
    address?: string;
    phone?: string;
    email?: string;
    mf?: string;
  };
  options?: {
    includeTaxBreakdown?: boolean;
    includeNotes?: boolean;
  };
};
