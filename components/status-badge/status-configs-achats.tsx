import type { StatusConfig } from "@/components/status-badge/generic-status-badge";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Wallet,
  FileEdit,
  Truck,
  Hourglass,
  ShieldX,
  PackageX,
  FileCheck,
} from "lucide-react";

export const chequeStatusConfig: StatusConfig = {
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

export const blStatusConfig: StatusConfig = {
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

export const stockStatusConfig: StatusConfig = {
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

export const achatStatusConfig: StatusConfig = {
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

export const bonCommandeStatusConfig: StatusConfig = {
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
