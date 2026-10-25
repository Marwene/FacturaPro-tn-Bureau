"use client";

import { useState, useEffect, useCallback, useRef, useDeferredValue } from "react";

import { usePathname, useRouter } from "next/navigation";
import { useGlobalSearch } from "@/hooks/use-global-search";
import {
  Search,
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
import { Dialog, DialogContent, DialogOverlay, DialogTitle } from "@/components/ui/dialog";
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

const PATH_MODULE_MAP: Record<string, string> = {
  clients: "clients",
  fournisseurs: "fournisseurs",
  produits: "produits",
  factures: "factures",
  devis: "devis",
  "bons-commande": "bons-commande",
  "bons-livraison": "bons-livraison",
  avoirs: "avoirs",
  achats: "achats",
  paiements: "paiements",
  cheques: "cheques",
  exports: "exports",
  rapports: "rapports",
  inventaire: "inventaire",
  "stock-mouvements": "stock-mouvements",
};

function detectModule(pathname: string): string | null {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return null;
  return PATH_MODULE_MAP[segments[0] as keyof typeof PATH_MODULE_MAP] ?? null;
}

const EMPTY_GROUPS: SearchGroup[] = [];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const deferredQuery = useDeferredValue(query);

  const currentModule = detectModule(pathname);
  const hasSearch = deferredQuery.trim().length > 0;

  // Recherche serveur (ex-effet fetch, ex-L85) → TanStack Query via
  // `hooks/use-global-search.ts` : la queryKey reprend les 3 dépendances
  // exactes de l'ancien effet (deferredQuery, currentModule, selectedModule)
  // et `enabled` sa garde `deferredQuery.trim()` ; `placeholderData` conserve
  // les résultats précédents pendant le fetch (l'ancien effet ne vidait
  // `groups` qu'à la requête vide) ; staleTime 0 parce que l'ancien effet
  // refaisait l'appel à chaque changement de dépendances.
  const search = useGlobalSearch(deferredQuery, currentModule, selectedModule);

  // Derniers résultats reçus, conservés si un fetch échoue (l'ancien effet ne
  // réaffectait pas `groups` dans son .catch). Ajustement au rendu.
  const [lastGroups, setLastGroups] = useState<SearchGroup[]>(EMPTY_GROUPS);
  if (search.data !== undefined && search.data !== lastGroups) {
    setLastGroups(search.data);
  }

  const groups = hasSearch ? (search.data ?? lastGroups) : EMPTY_GROUPS;

  // Recentrage du module sélectionné sur les résultats — reprend la logique de
  // l'ancien effet (ex-L103-109) en ajustement au rendu (React « storing
  // information from previous renders ») : mêmes déclencheurs que le .then de
  // l'ancien effet, savoir l'arrivée d'un résultat (dataUpdatedAt) ou le
  // changement de `groups` (requête vidée), sans écriture dans un effet.
  const [prevAdjust, setPrevAdjust] = useState({ groups, updatedAt: search.dataUpdatedAt });
  if (prevAdjust.groups !== groups || prevAdjust.updatedAt !== search.dataUpdatedAt) {
    setPrevAdjust({ groups, updatedAt: search.dataUpdatedAt });
    if (groups.length > 0 && !selectedModule) {
      setSelectedModule(groups[0].module);
    } else if (groups.length === 0) {
      setSelectedModule(null);
    } else if (selectedModule && !groups.find((gr) => gr.module === selectedModule)) {
      setSelectedModule(groups[0].module);
    }
  }

  // Reset de l'état à la fermeture (branche `else` de l'ex-effet [open],
  // ex-L144-148) : ajustement au rendu sur les mêmes dépendances ; `groups`
  // redevient vide via `hasSearch` dès que le debounce vide le champ.
  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (!open) {
      setQuery("");
      setSelectedModule(null);
    }
  }

  // Index de sélection dérivé au rendu (ex-effet [selectedModule, groups],
  // ex-L120) : `nav` retient l'état au dernier ↑/↓ et l'index dérivé retombe
  // à 0 dès que le module ou le groupe change ou qu'un résultat frais arrive
  // (dataUpdatedAt augmente ; `<=` ignore la remise à 0 de dataUpdatedAt
  // pendant le fetch, où l'ancien effet ne resetait pas non plus l'index).
  const [nav, setNav] = useState<{ groups: SearchGroup[]; module: string | null; updatedAt: number; index: number }>({
    groups: EMPTY_GROUPS,
    module: null,
    updatedAt: 0,
    index: 0,
  });
  const selectedItemIndex =
    nav.groups === groups && nav.module === selectedModule && search.dataUpdatedAt <= nav.updatedAt
      ? nav.index
      : 0;
  const storeNav = (index: number) =>
    setNav({ groups, module: selectedModule, updatedAt: search.dataUpdatedAt, index });

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.code === "Space") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Focus de l'input à l'ouverture — seul effet conservé avec le raccourci
  // clavier, réduit au seul focus DOM impératif : au rendu où `open` bascule,
  // l'input n'est pas encore monté (ref null) et le focus doit attendre les
  // 50 ms que le focus-trap Radix se pose ; ni le rendu ni un ref callback
  // (qui s'exécuterait au commit, sans ce délai) ne peuvent le faire de façon
  // fiable. La branche reset (else) est passée au rendu ci-dessus.
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 50);
    return () => clearTimeout(timer);
  }, [open]);

  const loading = search.isFetching;

  const navigate = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router],
  );

  const selectedGroup = groups.find((g) => g.module === selectedModule);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogOverlay className="bg-black/40 backdrop-blur-sm" />
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-[680px] max-h-[70vh] p-0 gap-0 overflow-hidden shadow-2xl top-[18%] translate-y-0"
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">Recherche globale</DialogTitle>
        {/* Search input */}
        <div className="flex items-center gap-3 border-b px-5 py-3.5">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={currentModule ? `Rechercher dans ${PATH_MODULE_MAP[currentModule] ?? currentModule}...` : "Rechercher un client, facture, produit..."}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
            onKeyDown={(e) => {
              if (!selectedGroup || selectedGroup.items.length === 0) return;
              const max = selectedGroup.items.length - 1;
              if (e.key === "ArrowDown") {
                e.preventDefault();
                storeNav(selectedItemIndex < max ? selectedItemIndex + 1 : 0);
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                storeNav(selectedItemIndex > 0 ? selectedItemIndex - 1 : max);
              } else if (e.key === "Enter") {
                e.preventDefault();
                navigate(selectedGroup.items[selectedItemIndex].href);
              }
            }}
          />
          {loading && <span className="size-3 rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground animate-spin" />}
        </div>

        {/* Results area */}
        {query.trim() && (
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
                    onClick={() => setSelectedModule(g.module)}
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
                    <ResultRow key={item.id} item={item} module={selectedGroup.module} highlighted={idx === selectedItemIndex} onSelect={navigate} />
                  ))}
                </div>
              )}
              {!loading && selectedGroup && selectedGroup.items.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-8">Aucun résultat dans ce module</p>
              )}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!query.trim() && (
          <div className="flex items-center justify-center h-[120px] text-xs text-muted-foreground">
            Tapez pour rechercher dans tous les modules
          </div>
        )}

        {/* Footer */}
        <div className="border-t px-4 py-1.5 flex items-center gap-3 text-[10px] text-muted-foreground">
          <span>Ctrl+Espace</span>
          <span className="text-muted-foreground/30">·</span>
          <span>↑↓ Navigation</span>
          <span className="text-muted-foreground/30">·</span>
          <span>Entrée Ouvrir</span>
        </div>
      </DialogContent>
    </Dialog>
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
