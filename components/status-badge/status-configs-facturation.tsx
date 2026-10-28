import type { StatusConfig } from "@/components/status-badge/generic-status-badge";
import {
  Send,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Landmark,
  FileEdit,
  CircleDollarSign,
  Receipt,
  Briefcase,
  ArrowRightLeft,
  RotateCcw,
} from "lucide-react";

export const invoiceStatusConfig: StatusConfig = {
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

export const quoteStatusConfig: StatusConfig = {
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

export const avoirStatusConfig: StatusConfig = {
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

export const effetStatusConfig: StatusConfig = {
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
