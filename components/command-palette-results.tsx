"use client";

import {
  Users,
  Truck,
  Package,
  FileText,
  FileSignature,
  ShoppingCart,
  Undo2,
  ShoppingBag,
  CreditCard,
  Globe,
  Ban,
  BarChart3,
  RotateCcw,
  Warehouse,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { SearchGroup, SearchItem } from "@/lib/search";

const MODULE_ICONS: Record<string, { icon: React.ReactNode; color: string }> = {
  clients: { icon: <Users className="h-3.5 w-3.5" />, color: "text-blue-500" },
  fournisseurs: { icon: <Truck className="h-3.5 w-3.5" />, color: "text-orange-500" },
  produits: { icon: <Package className="h-3.5 w-3.5" />, color: "text-emerald-500" },
  factures: { icon: <FileText className="h-3.5 w-3.5" />, color: "text-violet-500" },
  devis: { icon: <FileSignature className="h-3.5 w-3.5" />, color: "text-cyan-500" },
  "bons-commande": { icon: <ShoppingCart className="h-3.5 w-3.5" />, color: "text-amber-500" },
  "bons-livraison": { icon: <Truck className="h-3.5 w-3.5" />, color: "text-sky-500" },
  avoirs: { icon: <Undo2 className="h-3.5 w-3.5" />, color: "text-rose-500" },
  achats: { icon: <ShoppingBag className="h-3.5 w-3.5" />, color: "text-indigo-500" },
  paiements: { icon: <CreditCard className="h-3.5 w-3.5" />, color: "text-green-500" },
  cheques: { icon: <Ban className="h-3.5 w-3.5" />, color: "text-red-500" },
  exports: { icon: <Globe className="h-3.5 w-3.5" />, color: "text-teal-500" },
  rapports: { icon: <BarChart3 className="h-3.5 w-3.5" />, color: "text-orange-500" },
  inventaire: { icon: <Warehouse className="h-3.5 w-3.5" />, color: "text-emerald-500" },
  "stock-mouvements": { icon: <RotateCcw className="h-3.5 w-3.5" />, color: "text-emerald-500" },
};

type PaletteResultsProps = {
  groups: SearchGroup[];
  loading: boolean;
  selectedModule: string | null;
  onSelectModule: (module: string) => void;
  selectedGroup: SearchGroup | undefined;
  selectedItemIndex: number;
  onSelect: (href: string) => void;
};

/**
 * Zone de résultats de la palette de commandes : colonne des modules à gauche
 * (icône + libellé + compteur), résultats du module sélectionné à droite.
 * Section extraite de `command-palette.tsx` — markup et comportement
 * strictement identiques (0 ligne de rendu modifiée).
 */
export function PaletteResults({
  groups,
  loading,
  selectedModule,
  onSelectModule,
  selectedGroup,
  selectedItemIndex,
  onSelect,
}: PaletteResultsProps) {
  return (
    <div className="flex min-h-[220px]">
      {/* Left: modules */}
      <div className="w-[200px] shrink-0 border-r overflow-y-auto py-2">
        {groups.length === 0 && !loading && (
          <p className="text-xs text-muted-foreground text-center py-8">Aucun résultat</p>
        )}
        {groups.map((g) => {
          const mi = MODULE_ICONS[g.module];
          return (
            <button
              key={g.module}
              onClick={() => onSelectModule(g.module)}
              className={cn(
                "w-full flex items-center gap-2.5 px-4 py-2 text-left text-sm transition-colors",
                selectedModule === g.module
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
              )}
            >
              {mi && <span className={cn("shrink-0", mi.color)}>{mi.icon}</span>}
              <span className="flex-1 truncate">{g.moduleLabel}</span>
              <Badge variant="secondary" className="h-4 text-[10px] tabular-nums px-1.5">
                {g.items.length}
              </Badge>
            </button>
          );
        })}
      </div>

      {/* Right: results */}
      <div className="flex-1 overflow-y-auto py-2">
        {loading && (
          <p className="text-xs text-muted-foreground text-center py-8">Recherche en cours...</p>
        )}
        {!loading && selectedGroup && selectedGroup.items.length > 0 && (
          <div>
            {selectedGroup.items.map((item, idx) => (
              <ResultRow key={item.id} item={item} module={selectedGroup.module} highlighted={idx === selectedItemIndex} onSelect={onSelect} />
            ))}
          </div>
        )}
        {!loading && selectedGroup && selectedGroup.items.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-8">Aucun résultat dans ce module</p>
        )}
      </div>
    </div>
  );
}

function ResultRow({ item, module, highlighted, onSelect }: { item: SearchItem; module: string; highlighted: boolean; onSelect: (href: string) => void }) {
  const mi = MODULE_ICONS[module];
  return (
    <button
      onClick={() => onSelect(item.href)}
      className={cn(
        "w-full flex items-start gap-3 px-4 py-2.5 text-left transition-colors",
        highlighted ? "bg-accent text-accent-foreground" : "hover:bg-accent/50",
      )}
    >
      {mi && <span className={cn("mt-0.5 shrink-0", mi.color)}>{mi.icon}</span>}
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium">{item.label}</span>
        {item.subtitle && <span className="block text-[11px] text-muted-foreground truncate">{item.subtitle}</span>}
      </div>
    </button>
  );
}
