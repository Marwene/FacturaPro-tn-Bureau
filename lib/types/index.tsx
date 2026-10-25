// All decimal fields are serialized to strings for safe client transport

export type {
    InvoiceStatus,
    QuoteStatus,
    ChequeType,
    ChequeStatus,
    PaymentMethod,
    StockStatus,
    DeliveryNoteStatus,
    AchatStatus,
    AchatType,
    AchatCategorie,
    MouvementType,
    BonCommandeStatus,
    ExportStatus,
    AvoirStatus,
    MouvementFinancierType,
    AvoirType,
    EffetStatus,
    EffetType,
    OrdreFabricationStatus,
    RapprochementStatus,
    DesignStatutStatus,
    PackingListStatus,
} from "./enums";

export type { SerializedTiers, TiersDetailStats, TiersDocument, TiersSoldeEntry, TiersSoldeResponse, TiersBlocageInfo, TiersDocumentSummary, TiersDocumentsResponse } from "./client";
export type { SerializedProduct, ProductSupplierOption, ProductRef } from "./product";
export type { SerializedProductVariant } from "./variant";
export type { SerializedInvoiceLine, SerializedInvoice, SerializedInvoiceCheque } from "./invoice";
export type { SerializedQuoteLine, SerializedQuote } from "./quote";
export type { SerializedDeliveryNoteLine, SerializedDeliveryNote } from "./delivery-note";
export type { SerializedPayment } from "./payment";
export type { SerializedCheque } from "./cheque";
export type { SerializedEffet, SerializedCompanyBankAccount, SerializedEffetAchat } from "./effet";
export type { SerializedSettings } from "./settings";
export type { SerializedAchatLine, SerializedAchat, SerializedStockMovement } from "./achat";
export type { SerializedBonCommandeLine, SerializedBonCommande, SerializedBonCommandeLigneDetail, SerializedBonCommandeOF } from "./bon-commande";
export type { SerializedNgpCode, SerializedExportLine, SerializedExport } from "./ngp-export";
export type { SerializedAvoirLine, SerializedAvoir, SerializedMouvementFinancier } from "./avoir";
export type { DashboardStats, ChartDataPoint, TopClient } from "./dashboard";
export type { ReportData } from "./reports";
export type { SerializedDesignPersonnalise, DesignAvecProduit, DesignAvecRelations } from "./design";
export type { SerializedMatierePremiere } from "./matiere";
export type { SerializedOrdreFabrication, OrdreAvecProduct, OrdrePlan, OFDetailLine } from "./ordre-fabrication";
export type { SerializedPackingList, PackingOFDetail } from "./packing-list";
export type { SerializedUser } from "./user";
