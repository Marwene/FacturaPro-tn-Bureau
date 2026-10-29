"use client";

import { useState, useEffect, useCallback, useRef, useDeferredValue } from "react";

import { usePathname, useRouter } from "next/navigation";
import { useGlobalSearch } from "@/hooks/use-global-search";
import { Search } from "lucide-react";
import { Dialog, DialogContent, DialogOverlay, DialogTitle } from "@/components/ui/dialog";
import type { SearchGroup } from "@/lib/search";
import {
  PATH_MODULE_MAP,
  detectModule,
  reconcileSelectedModule,
  nextNavIndex,
} from "@/lib/command-palette-logic";
import { PaletteResults } from "@/components/command-palette-results";

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
  // changement de `groups` (requête vidée), sans écriture dans un effet. Les
  // 3 branches vives dans `reconcileSelectedModule`
  // (`lib/command-palette-logic.ts`, pur et testable) ; écriture seulement si
  // la valeur change réellement (bail-out React identique à l'ex-appel à
  // valeur égale).
  const [prevAdjust, setPrevAdjust] = useState({ groups, updatedAt: search.dataUpdatedAt });
  if (prevAdjust.groups !== groups || prevAdjust.updatedAt !== search.dataUpdatedAt) {
    setPrevAdjust({ groups, updatedAt: search.dataUpdatedAt });
    const nextModule = reconcileSelectedModule(groups, selectedModule);
    if (nextModule !== selectedModule) setSelectedModule(nextModule);
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

  // Keyboard shortcut — Justification useEffect : souscription à un API
  // navigateur (listener `keydown` global) = système externe non réactif,
  // autorisé par les CODE RULES. Ctrl+Espace ouvre/ferme la palette, Échap la
  // ferme.
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

  // Justification useEffect : focus de l'input à l'ouverture — seul effet
  // conservé avec le raccourci clavier, réduit au seul focus DOM impératif :
  // au rendu où `open` bascule, l'input n'est pas encore monté (ref null) et le
  // focus doit attendre les 50 ms que le focus-trap Radix se pose ; ni le rendu
  // ni un ref callback (qui s'exécuterait au commit, sans ce délai) ne peuvent
  // le faire de façon fiable. La branche reset (else) est passée au rendu
  // ci-dessus.
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
              if (e.key === "Enter") {
                e.preventDefault();
                navigate(selectedGroup.items[selectedItemIndex].href);
                return;
              }
              // ↑/↓ : logique d'index extraite dans `nextNavIndex` (pur,
              // testable) — `null` = touche non gérée, donc aucun preventDefault.
              const nextIndex = nextNavIndex(e.key, selectedItemIndex, max);
              if (nextIndex === null) return;
              e.preventDefault();
              storeNav(nextIndex);
            }}
          />
          {loading && <span className="size-3 rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground animate-spin" />}
        </div>

        {/* Results area (section extraite : components/command-palette-results.tsx) */}
        {query.trim() && (
          <PaletteResults
            groups={groups}
            loading={loading}
            selectedModule={selectedModule}
            onSelectModule={setSelectedModule}
            selectedGroup={selectedGroup}
            selectedItemIndex={selectedItemIndex}
            onSelect={navigate}
          />
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
