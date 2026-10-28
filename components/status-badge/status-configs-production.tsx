import type { StatusConfig } from "@/components/status-badge/generic-status-badge";
import {
  CheckCircle2,
  XCircle,
  FileEdit,
  Hourglass,
  ShieldCheck,
  Loader2,
  GitMerge,
  Factory,
  FileDown,
  AlertCircle,
} from "lucide-react";

export const ordreFabricationStatusConfig: StatusConfig = {
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

export const rapprochementStatusConfig: StatusConfig = {
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

export const designStatutConfig: StatusConfig = {
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

export const packingListStatusConfig: StatusConfig = {
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
