import { cn } from "@/lib/utils";
import type { InvoiceStatus, QuoteStatus, ChequeStatus, StockStatus, DeliveryNoteStatus, AchatStatus, AvoirStatus, EffetStatus, BonCommandeStatus, OrdreFabricationStatus, RapprochementStatus, DesignStatutStatus, PackingListStatus } from "@/lib/types";
import { Receipt } from "lucide-react";
import { GenericStatusBadge, type StatusConfig } from "@/components/status-badge/generic-status-badge";
import { invoiceStatusConfig, quoteStatusConfig, avoirStatusConfig, effetStatusConfig } from "@/components/status-badge/status-configs-facturation";
import { chequeStatusConfig, blStatusConfig, stockStatusConfig, achatStatusConfig, bonCommandeStatusConfig } from "@/components/status-badge/status-configs-achats";
import { ordreFabricationStatusConfig, rapprochementStatusConfig, designStatutConfig, packingListStatusConfig } from "@/components/status-badge/status-configs-production";

function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return <GenericStatusBadge status={status} config={invoiceStatusConfig} />;
}
function QuoteStatusBadge({ status }: { status: QuoteStatus }) {
  return <GenericStatusBadge status={status} config={quoteStatusConfig} />;
}
function ChequeStatusBadge({ status }: { status: ChequeStatus }) {
  return <GenericStatusBadge status={status} config={chequeStatusConfig} />;
}
function DeliveryNoteStatusBadge({ status }: { status: DeliveryNoteStatus }) {
  return <GenericStatusBadge status={status} config={blStatusConfig} />;
}
function StockStatusBadge({ status }: { status: StockStatus }) {
  return <GenericStatusBadge status={status} config={stockStatusConfig} />;
}
function AchatStatusBadge({ status }: { status: AchatStatus }) {
  return <GenericStatusBadge status={status} config={achatStatusConfig} />;
}
function AvoirStatusBadge({ status }: { status: AvoirStatus }) {
  return <GenericStatusBadge status={status} config={avoirStatusConfig} />;
}
function EffetStatusBadge({ status }: { status: EffetStatus }) {
  return <GenericStatusBadge status={status} config={effetStatusConfig} />;
}
function BonCommandeStatusBadge({ status }: { status: BonCommandeStatus }) {
  return <GenericStatusBadge status={status} config={bonCommandeStatusConfig} />;
}
function OrdreFabricationStatusBadge({ status }: { status: OrdreFabricationStatus }) {
  return <GenericStatusBadge status={status} config={ordreFabricationStatusConfig} />;
}
function RapprochementStatusBadge({ status }: { status: RapprochementStatus }) {
  return <GenericStatusBadge status={status} config={rapprochementStatusConfig} />;
}
function DesignStatutBadge({ status }: { status: DesignStatutStatus }) {
  return <GenericStatusBadge status={status} config={designStatutConfig} />;
}
function PackingListStatusBadge({ status }: { status: PackingListStatus }) {
  return <GenericStatusBadge status={status} config={packingListStatusConfig} />;
}

const invoicedBadgeConfig: StatusConfig = {
  FACTURE: {
    label: "Facturé",
    className: "bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-400",
    icon: <Receipt />,
  },
};

export const invoicedBadgeVioletClass =
  "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-400 border-transparent";

function QuoteInvoicedBadge({
  numero,
  date,
  className,
}: {
  numero?: string;
  date?: string;
  className?: string;
} = {}) {
  return (
    <GenericStatusBadge
      status="FACTURE"
      config={invoicedBadgeConfig}
      className={cn("w-fit", className)}
    >
      {numero ? ` le : ${numero}` : ""}
      {date ? ` (${date})` : ""}
    </GenericStatusBadge>
  );
}

type StatusType =
  | "invoice"
  | "quote"
  | "cheque"
  | "delivery-note"
  | "stock"
  | "achat"
  | "avoir"
  | "effet"
  | "bon-commande"
  | "ordre-fabrication"
  | "rapprochement"
  | "design"
  | "packing-list";

const statusConfigsByType: Record<StatusType, StatusConfig> = {
  invoice: invoiceStatusConfig,
  quote: quoteStatusConfig,
  cheque: chequeStatusConfig,
  "delivery-note": blStatusConfig,
  stock: stockStatusConfig,
  achat: achatStatusConfig,
  avoir: avoirStatusConfig,
  effet: effetStatusConfig,
  "bon-commande": bonCommandeStatusConfig,
  "ordre-fabrication": ordreFabricationStatusConfig,
  rapprochement: rapprochementStatusConfig,
  design: designStatutConfig,
  "packing-list": packingListStatusConfig,
};

interface StatusBadgeProps {
  type: StatusType;
  status: string;
  className?: string;
}

function StatusBadge({ type, status, className }: StatusBadgeProps) {
  const config = statusConfigsByType[type];
  if (!config) return null;
  return <GenericStatusBadge status={status} config={config} className={className} />;
}

export {
  InvoiceStatusBadge,
  QuoteStatusBadge,
  ChequeStatusBadge,
  DeliveryNoteStatusBadge,
  StockStatusBadge,
  AchatStatusBadge,
  AvoirStatusBadge,
  EffetStatusBadge,
  QuoteInvoicedBadge,
  BonCommandeStatusBadge,
  OrdreFabricationStatusBadge,
  RapprochementStatusBadge,
  DesignStatutBadge,
  PackingListStatusBadge,
  StatusBadge,
  type StatusType,
};
