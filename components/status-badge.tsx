import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { InvoiceStatus, QuoteStatus, ChequeStatus, StockStatus, DeliveryNoteStatus, AchatStatus, AvoirStatus, EffetStatus, BonCommandeStatus, OrdreFabricationStatus, RapprochementStatus, DesignStatutStatus, PackingListStatus } from "@/lib/types";
import {
  Send,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Landmark,
  Wallet,
  FileEdit,
  CircleDollarSign,
  Receipt,
  Truck,
  Hourglass,
  ShieldCheck,
  ShieldX,
  Loader2,
  PackageX,
  FileCheck,
  Briefcase,
  ArrowRightLeft,
  GitMerge,
  Factory,
  FileDown,
  RotateCcw,
  AlertCircle,
} from "lucide-react";

type StatusConfig = Record<string, { label: string; className: string; icon: React.ReactNode }>;

function GenericStatusBadge({ status, config, className, children }: { status: string; config: StatusConfig; className?: string; children?: React.ReactNode }) {
  const cfg = config[status];
  if (!cfg) return null;
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 px-2.5 py-1 text-xs font-medium border-0 transition-colors",
        cfg.className,
        className,
      )}
    >
      <span className="shrink-0 [&>svg]:size-3.5">{cfg.icon}</span>
      {cfg.label}
      {children}
    </Badge>
  );
}

const invoiceStatusConfig: StatusConfig = {
  BROUILLON: {
    label: "Brouillon",
    className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    icon: <FileEdit />,
  },
  ENVOYEE: {
    label: "Envoyée",
    className: "bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-400",
    icon: <Send />,
  },
  PARTIELLE: {
    label: "Partielle",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400",
    icon: <CircleDollarSign />,
  },
  PAYEE: {
    label: "Payée",
    className: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400",
    icon: <CheckCircle2 />,
  },
  EN_RETARD: {
    label: "En retard",
    className: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400",
    icon: <AlertTriangle />,
  },
  ANNULEE: {
    label: "Annulée",
    className: "bg-gray-100 text-gray-500 line-through dark:bg-gray-800/50 dark:text-gray-500",
    icon: <XCircle />,
  },
};

const quoteStatusConfig: StatusConfig = {
  BROUILLON: {
    label: "Brouillon",
    className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    icon: <FileEdit />,
  },
  ENVOYEE: {
    label: "Envoyé",
    className: "bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-400",
    icon: <Send />,
  },
  ACCEPTEE: {
    label: "Accepté",
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400",
    icon: <CheckCircle2 />,
  },
  REFUSEE: {
    label: "Refusé",
    className: "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-400",
    icon: <XCircle />,
  },
  EXPIREE: {
    label: "Expiré",
    className: "bg-stone-100 text-stone-700 dark:bg-stone-800/50 dark:text-stone-400",
    icon: <Clock />,
  },
  FACTUREE: {
    label: "Facturé",
    className: "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-400",
    icon: <Receipt />,
  },
};

const chequeStatusConfig: StatusConfig = {
  EN_ATTENTE: {
    label: "En attente",
    className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400",
    icon: <Hourglass />,
  },
  ENCAISSE: {
    label: "Encaissé",
    className: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400",
    icon: <Wallet />,
  },
  REJETE: {
    label: "Rejeté",
    className: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400",
    icon: <ShieldX />,
  },
  ANNULE: {
    label: "Annulé",
    className: "bg-gray-100 text-gray-500 line-through dark:bg-gray-800/50 dark:text-gray-500",
    icon: <XCircle />,
  },
};

const blStatusConfig: StatusConfig = {
  BROUILLON: {
    label: "Brouillon",
    className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    icon: <FileEdit />,
  },
  LIVRE: {
    label: "Livré",
    className: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-400",
    icon: <Truck />,
  },
  ANNULE: {
    label: "Annulé",
    className: "bg-gray-100 text-gray-500 line-through dark:bg-gray-800/50 dark:text-gray-500",
    icon: <XCircle />,
  },
  SN_VISE: {
    label: "SN Visé",
    className: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-400",
    icon: <FileCheck />,
  },
};

const stockStatusConfig: StatusConfig = {
  OK: {
    label: "OK",
    className: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400",
    icon: <CheckCircle2 />,
  },
  CRITIQUE: {
    label: "Critique",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400",
    icon: <AlertTriangle />,
  },
  RUPTURE: {
    label: "Rupture",
    className: "bg-red-100 text-red-700 font-semibold dark:bg-red-900/50 dark:text-red-400",
    icon: <PackageX />,
  },
};

const achatStatusConfig: StatusConfig = {
  BROUILLON: {
    label: "Brouillon",
    className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    icon: <FileEdit />,
  },
  VALIDEE: {
    label: "Validée",
    className: "bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-400",
    icon: <CheckCircle2 />,
  },
  ANNULEE: {
    label: "Annulée",
    className: "bg-gray-100 text-gray-500 line-through dark:bg-gray-800/50 dark:text-gray-500",
    icon: <XCircle />,
  },
};

const avoirStatusConfig: StatusConfig = {
  BROUILLON: {
    label: "Brouillon",
    className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    icon: <FileEdit />,
  },
  EMIS: {
    label: "Émis",
    className: "bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-400",
    icon: <Send />,
  },
  REMBOURSE: {
    label: "Remboursé",
    className: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400",
    icon: <RotateCcw />,
  },
  ANNULE: {
    label: "Annulé",
    className: "bg-gray-100 text-gray-500 line-through dark:bg-gray-800/50 dark:text-gray-500",
    icon: <XCircle />,
  },
};

const effetStatusConfig: StatusConfig = {
  EN_PORTEFEUILLE: {
    label: "En portefeuille",
    className: "bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-400",
    icon: <Briefcase />,
  },
  REMIS_ESCOMPTE: {
    label: "Remis à l'escompte",
    className: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-400",
    icon: <Landmark />,
  },
  ENDOSSE: {
    label: "Endossé",
    className: "bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-400",
    icon: <ArrowRightLeft />,
  },
  IMPAYE: {
    label: "Impayé",
    className: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400",
    icon: <CircleDollarSign />,
  },
  PAYE: {
    label: "Payé",
    className: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400",
    icon: <CheckCircle2 />,
  },
  ANNULE: {
    label: "Annulé",
    className: "bg-gray-100 text-gray-500 line-through dark:bg-gray-800/50 dark:text-gray-500",
    icon: <XCircle />,
  },
};

const bonCommandeStatusConfig: StatusConfig = {
  BROUILLON: {
    label: "Brouillon",
    className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    icon: <FileEdit />,
  },
  ACCEPTE: {
    label: "Accepté",
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400",
    icon: <CheckCircle2 />,
  },
  ANNULE: {
    label: "Annulé",
    className: "bg-gray-100 text-gray-500 line-through dark:bg-gray-800/50 dark:text-gray-500",
    icon: <XCircle />,
  },
};

const ordreFabricationStatusConfig: StatusConfig = {
  BROUILLON: {
    label: "Brouillon",
    className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    icon: <FileEdit />,
  },
  CONFIRME: {
    label: "Confirmé",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400",
    icon: <ShieldCheck />,
  },
  EN_COURS: {
    label: "En cours",
    className: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400",
    icon: <Loader2 className="animate-spin" />,
  },
  TERMINE: {
    label: "Terminé",
    className: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400",
    icon: <CheckCircle2 />,
  },
  ANNULE: {
    label: "Annulé",
    className: "bg-gray-100 text-gray-500 line-through dark:bg-gray-800/50 dark:text-gray-500",
    icon: <XCircle />,
  },
};

const rapprochementStatusConfig: StatusConfig = {
  RECONCILIE: {
    label: "Réconcilié",
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400",
    icon: <GitMerge />,
  },
  EN_ATTENTE: {
    label: "En attente",
    className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400",
    icon: <Hourglass />,
  },
  ECART: {
    label: "Écart",
    className: "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-400",
    icon: <AlertCircle />,
  },
};

const designStatutConfig: StatusConfig = {
  BROUILLON: {
    label: "Brouillon",
    className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    icon: <FileEdit />,
  },
  VALIDE: {
    label: "Validé",
    className: "bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-400",
    icon: <CheckCircle2 />,
  },
  PRODUCTION: {
    label: "Production",
    className: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400",
    icon: <Factory />,
  },
};

const packingListStatusConfig: StatusConfig = {
  GENERE: {
    label: "Généré",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400",
    icon: <FileDown />,
  },
  VALIDE: {
    label: "Validé",
    className: "bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-400",
    icon: <CheckCircle2 />,
  },
};

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
