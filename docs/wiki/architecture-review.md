# Architecture Review — Facturapro TN

> **Date**: 2026-09-05 (updated 2026-09-06 — deep module analysis)
> **Scope**: Full application — all modules (app/, components/, lib/, hooks/, prisma/schema.prisma)
> **Scale**: 112 API routes, 71 pages, ~264 components, 70 hooks, 46 Prisma models, 25+ Zustand stores
> **Methodology**: Read-only diagnostic. No code modified. Modules analyzed: Factures, Clients, Atelier/OF, Planning/Gantt, Customizer/3D, Stock, Rapports, POS, Chèques, Effets, Exports, Paramètres. Deep analysis added 2026-09-06 for modules not previously examined in depth.

---

## 1. ARCHITECTURE BREAKDOWN

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Next.js App Router (Server Components = thin shells)       │
├─────────────────────────────────────────────────────────────┤
│  Client Components (React, "use client")                    │
│    ├── Zustand Stores (UI state: search, filters, dialogs)  │
│    ├── TanStack Query Hooks (server state: CRUD, lists)     │
│    └── react-hook-form (form state in dialogs/forms)        │
├─────────────────────────────────────────────────────────────┤
│  API Routes (Next.js App Router)                            │
│    ├── apiRoute wrapper (50% of routes)                     │
│    └── Manual auth via getSessionFromRequest (50%)           │
├─────────────────────────────────────────────────────────────┤
│  Prisma ORM → PostgreSQL                                    │
└─────────────────────────────────────────────────────────────┘
```

**Architectural pattern**: The application follows a layered client-side architecture with thin server component shells. Pages are pure layout delegates; all data fetching, state management, and business logic lives in client components, hooks, and API routes. This is consistent and well-structured at the component/hook/store level.

### 1.2 Data Flow: Facture (Document-Heavy Module)

```
User → FacturesClient (list)
  ├── Zustand useInvoicesStore (searchInput, statusFilter)
  ├── TanStack useInvoiceList() → GET /api/invoices
  │     └── apiRoute.get → prisma.invoice.findMany + 4 aggregates (Promise.all)
  └── DataTable renders rows

User → NouvelleFactureClient (create)
  ├── Zustand useInvoiceFormStore (tiersId, lines[], dates, BC visé)
  ├── TanStack useClients(), useProducts() (reference data)
  ├── buildPayload() → createInvoice.mutate() → POST /api/invoices
  │     └── apiRoute.post → Zod validate → assertClientNonBloque
  │         → sequence.upsert (atomic numbering) → prisma.invoice.create
  └── Optimistic: temp row inserted, rolled back on error

User → FactureDetailClient (detail)
  ├── TanStack useInvoiceDetail(id) → GET /api/invoices/{id}
  │     └── apiRoute.get → prisma with nested includes (tiers, lines.product, payments)
  ├── Status change → updateStatus.mutate() → PATCH /api/invoices/{id}
  │     └── handleSaleStockMovement() in $transaction
  └── Payment → createPayment.mutate() → POST /api/payments
        └── applyPaymentToInvoice() in $transaction

PDF → invoiceToDocumentOptions() → buildDocumentHTML() → window.print()
```

**Quality**: Clean. apiRoute wrapper used consistently. TanStack Query with optimistic updates. Transactions for financial operations. No N+1 queries.

### 1.3 Data Flow: Clients (List/CRUD Module)

```
User → ClientsClient (list)
  ├── Zustand useClientsStore (search, editTiers, deleteTarget)
  ├── TanStack useClientsList() → GET /api/clients
  │     └── MANUAL auth → prisma.tiers.findMany + invoice.groupBy (solde)
  └── DataTable + stat cards

User → ClientDetailClient (detail)
  ├── TanStack useClientDetail(id) → GET /api/clients/{id}/detail
  │     └── MANUAL auth → 7-9 separate DB queries (Promise.all + checkBlocage)
  ├── Tabs: ClientDocumentsList, ClientSoldeTable
  │     └── TanStack useClientDocuments(id) → 5 tables via Promise.all
  │     └── TanStack useClientSolde(id, from, to) → 4 tables + JS computation
  └── ClientDialog (react-hook-form + zodResolver)
        └── useClientMutations().createClient → POST /api/clients
              └── MANUAL auth → prisma.tiers.create
```

**Quality**: Client-side architecture is clean (Zustand for UI, TanStack for data). But ALL 8 API routes use manual auth instead of apiRoute wrapper — violates CODE RULES. Solde computation logic is duplicated between `solde/route.ts` and `envoyer-rappel/route.ts`.

### 1.4 Data Flow: Atelier (Workflow Module)

```
User → OrdresFabricationClient (list)
  ├── TanStack useOrdresFabrication() → GET /api/ordres-fabrication
  │     └── apiRoute.get → prisma with 5 includes
  └── Status transitions: BROUILLON → CONFIRME → EN_COURS → TERMINE
        └── PUT /api/ordres-fabrication/[id] (NO backend validation!)

User → NouveauOFDialog (create)
  ├── Raw fetch("/api/products") in useEffect ← VIOLATION
  ├── TanStack useClientsList(), useDesignsPersonnalises()
  └── POST /api/ordres-fabrication
        └── Code gen: findFirst + string parsing (RACE CONDITION)

User → PlanningClient (Gantt)
  └── DnD scheduling → PUT OF with dateDebut/dateFin

User → PackingListClient (packing)
  ├── Client-side auto-distribution (repartirParTailles)
  ├── POST /api/packing-list
  │     └── $transaction: create PackingList + PackingCartons
  │     └── genererPackingDocuments() → jsPDF → write to disk
  └── GET /api/packing-list/[id]/pdf (lazy regeneration)
```

**Quality**: API routes are clean (all use apiRoute). But the component layer has 13+ `any` violations, a raw `fetch()` in `useEffect`, and the backend doesn't validate status transitions (state machine enforced only in UI).

### 1.5 Data Flows: Additional Modules

#### Customizer (3D/Konva — 26 files, ~4,554 LOC)

```
User → CustomizerStudio (layout + export)
  ├── Zustand: canvas-store (zoom/pan/history), layer-store (CRUD/reorder/lock),
  │   product-store (selection), upload-store (assets)
  ├── TanStack: useProduitDetail, useDesignPersonnaliseMutations
  ├── Raw fetch via useEffect ← VIOLATION (designs-personnalises load)
  └── Konva canvas (design-canvas.tsx, 531 LOC — monolith)
        ├── Image layers (base64 data URLs in memory)
        ├── Text layers
        ├── Embroidery layers (stitch-engine, thread-colors)
        └── Transformer/selection handling
```

**Quality**: State is well-decomposed into 4 Zustand stores. But `design-canvas.tsx` (531 LOC) is a monolith mixing layer rendering, zoom/pan, selection, drag/transform, stitch generation, and image loading. Undo/redo system exists but is dead code (never called by layer-store). 12 `any` violations. Raw `fetch` in `useEffect` for design loading.

#### Planning (Gantt — 7 files, ~1,224 LOC)

```
User → PlanningClient (sidebar + Gantt wrapper)
  ├── TanStack: useOrdresFabrication()
  ├── 7 useState for plan dialog, viewMode, unschedule
  └── GanttChart (551 LOC — monolith)
        ├── TimelineSlot, RowDropZone (DnD with @dnd-kit)
        ├── Conflict detection (visual only — no prevention)
        ├── Hardcoded production lines (not from DB)
        └── Auto-scroll, resize observer, current time indicator
```

**Quality**: All server state via TanStack Query (clean). No Zustand stores (OK for this module size). But `gantt-chart.tsx` (551 LOC) mixes DnD context, time calculations, conflict detection, grid rendering, and drag preview. 10 `any` violations in `planning-client.tsx`. Conflicts are detected visually but not prevented server-side. Production lines are hardcoded in the component.

#### Stock (14 files, ~1,679 LOC)

```
User → MouvementsClient (list) / InventaireClient (dashboard)
  ├── TanStack: useStockMouvements, useInventaire
  └── No Zustand stores (stateless UI)

API Routes:
  GET /api/stock-mouvements ← MANUAL auth, NO companyId
  GET /api/inventaire ← MANUAL auth, NO companyId
  POST /api/products/{id}/stock-mouvements ← MANUAL auth, NOT in $transaction
```

**Quality**: Clean client-side (no any, no useEffect, all TanStack Query). But critical backend issues:
- Stock POST route (`stock-movements/route.ts:78-92`) does `stockMovement.create` + `product.update` as **separate queries** — not in a `$transaction`. Crash between the two leaves inconsistent data.
- All 3 stock routes lack `companyId` scoping — potential cross-tenant data leak.
- `recalculateStockStatus` function is duplicated in `lib/stock-utils.ts` (standalone + tx variant).

#### Rapports (8 files, ~1,032 LOC)

```
User → RapportsClient (fiscal dashboard) / RapportInventaire (inventory report)
  ├── TanStack: useReports(year), useRapportInventaire(periode)
  ├── Zustand: useReportsStore.selectedYear
  └── lib/export-report.ts — PDF/Excel export
```

**Quality**: Clean client-side. But `app/api/reports/route.ts` has a **logic bug** in "last month" calculation: when `currentMonth === 1`, it includes all January data instead of previous December. ~~TEJ XML export is a **stub** (placeholder `...` for invoice lines).~~ ✅ TEJ XML stub resolved (2026-09-06). The inventory report route loads ALL products without `actif: true` filter.

#### POS (3 files, ~316 LOC)

```
User → POSClient (terminal UI)
  ├── Zustand: usePOSStore (cart, search, totals — Big.js arithmetic)
  ├── TanStack: useProducts(searchQuery)
  └── "Valider la vente" button ← NO onClick handler
```

**Quality**: UI shell only — **NOT FUNCTIONAL**. The "Valider la vente" button has no handler. No API routes exist under `app/api/pos/`. No sale record creation, no payment processing, no stock deduction. Cart has no stock validation (can add unlimited quantity). No FODEC calculation in cart totals.

#### Chèques (5 files, ~465 LOC)

```
User → ChequesClient (list)
  ├── TanStack: useChequesList (query + mutations with optimistic updates)
  └── Zustand: tab state
```

**Quality**: Clean. All routes use `apiRoute` wrapper. Amount calculations use `Big.js`. But encaisser route lacks transaction wrapping (cheque update + payment creation not atomic). Duplicate hooks: `use-cheques.ts` and `use-cheques-queries.ts` define overlapping interfaces.

#### Effets (20 files, ~4,443 LOC)

```
User → EffetsClient (list) → NouvelEffetClient (1,141 LOC — god component)
  ├── Zustand: useEffetsStore (search, filters)
  ├── TanStack: useEffets (query + mutations)
  ├── Module-level mutable state (`export let effetFormData`) ← ANTI-PATTERN
  ├── forceUpdate via useState(0) ← ANTI-PATTERN
  └── 3 raw fetch calls in component handlers (some via useQuery queryFn)

User → EffetDetailClient (671 LOC)
  ├── State updates during render body ← VIOLATION
  └── Escompte calculation computed client-side, trusted by server
```

**Quality**: **Worst code quality in the app.** `nouvel-effet-client.tsx` (1,141 LOC) is a god component with:
- Module-level mutable state (`export let effetFormData`) bypassing React's state model
- `forceUpdate` anti-pattern via `useState(0)`
- 15+ useState variables
- State updates during render phase (`effet-detail-client.tsx:86-97`)

Backend: `effets/batch/route.ts` creates multiple effets in a loop without `$transaction`. `check-echeances/route.ts` does mutations (DB updates, email sending) inside a GET request. `effets/check-echeances/route.ts` bypasses `apiRoute` wrapper.

#### Exports (21 files, ~2,436 LOC)

```
User → ExportsClient (list) → NouvelExportDialog (create) / ModifierExportDialog (edit)
  ├── Zustand: 5 store files (list, create, edit, shared, barrel)
  ├── TanStack: useExports (query + mutations)
  └── API: apiRoute compliant
```

**Quality**: Well-decomposed stores (5 files). But `export-list-columns.tsx:29` has 3 `any` parameters. `hooks/use-exports.ts` has a `useEffect` for search debounce (forbidden by CODE RULES). `exports/[id]/route.ts` PATCH has no Zod validation. Line replacement (delete-all + create-many) not in `$transaction`. Duplicate hooks: `use-exports.ts` + `use-exports-queries.ts`.

#### Paramètres (13 files, ~1,074 LOC)

```
User → ParametresClient (settings form)
  ├── TanStack: useSettingsData, useSettingsMutations
  ├── react-hook-form + zodResolver (with `as any` cast)
  └── Tabs: CartonTypesManager (347 LOC), Numerotation, Societe, Contact, Alertes, Fiscal
```

**Quality**: Clean client-side. But `app/api/settings/app/route.ts` and `app/api/companies/` routes bypass `apiRoute` wrapper (manual auth). `settings/route.ts` PUT has no server-side Zod validation. `companies/[id]/route.ts` PATCH has no validation schema. Placeholder components: `param-tva-manager.tsx`, `param-ras-manager.tsx`.

---

## 2. PROBLEM AREAS

### 2.1 apiRoute Wrapper Inconsistency (HIGH — Security + Maintainability)

**Finding**: 56 of 112 API routes (50%) use the `apiRoute` wrapper. The other 56 manually call `getSessionFromRequest` + `checkPermission`.

**Non-compliant modules** (manual auth):
- `app/api/clients/` — all 8 routes
- `app/api/fournisseurs/` — all 6 routes
- `app/api/categories/` — all routes
- `app/api/marques/` — all routes
- `app/api/products/` — all routes
- `app/api/users/` — all routes
- `app/api/settings/` — all routes
- `app/api/companies/` — all routes
- `app/api/notifications/` — all routes
- `app/api/stock-mouvements/` — all routes

**Compliant modules** (use apiRoute):
- `app/api/invoices/` — all routes
- `app/api/quotes/` — all routes
- `app/api/bons-commande/` — all routes
- `app/api/bons-livraison/` — all routes
- `app/api/achats/` — all routes
- `app/api/avoirs/` — all routes
- `app/api/ordres-fabrication/` — all routes
- `app/api/packing-list/` — all routes
- `app/api/effets/` — all routes
- `app/api/cheques/` — all routes
- `app/api/payments/` — all routes
- `app/api/exports/` — all routes

**Impact**: Manual auth means each route reimplements session parsing, permission checking, and error formatting. Any security fix to the wrapper must be manually replicated across 56 routes. Inconsistent error response formats.

**Why it happened**: The wrapper was likely introduced mid-project. Older modules (clients, products, categories) were written before it existed and never migrated.

### 2.2 `calcLineTotals` Duplication (HIGH — Financial Logic)

**Finding**: The same `calcLineTotals` function is copy-pasted into **8 separate component files**:

| File | Lines |
|------|-------|
| `components/factures/nouvelle-facture-client.tsx` | 26-35 |
| `components/factures/invoice-form-lines.tsx` | 37-46 |
| `components/devis/nouveau-devis-client.tsx` | 24-33 |
| `components/achats/achat-form-lines.tsx` | 35-44 |
| `components/achats/scan-verif-lines-table.tsx` | 14-23 |
| `components/avoirs/avoir-form-lines.tsx` | 36-45 |
| `components/avoirs/nouvel-avoir-client.tsx` | 25-34 |
| `components/bons-livraison/bl-form-lines.tsx` | 21-30 |
| `components/bons-livraison/nouveau-bl-client.tsx` | 26-35 |

The function computes HT, TVA, FODEC, and total from line quantities/prices/discounts using `Big.js`. Each copy is nearly identical (some pass `clientExonereTVA` as a parameter, some don't).

**Impact**: This is **financial calculation logic**. A bug fix or rounding change in one copy won't propagate to the others. The `lib/decimal.ts` file already exports `calcLineHT`, `calcTVA`, `calcFodec`, and `calcRetenue` — but the component-level `calcLineTotals` wrapper that combines them is not extracted.

### 2.3 `any` Type Violations (MEDIUM — Type Safety)

**Finding**: 18+ instances of ` as any` across components, hooks, and lib. Major clusters:

| Area | Count | Examples |
|------|-------|---------|
| Atelier hooks | 6+ | `use-ordres-fabrication.ts:21,33`, `use-packing-list.ts:21,33`, `use-matieres-premieres.ts:21,33` — all return `Promise<{ data: any }>` |
| Atelier components | 5+ | `ordres-fabrication-client.tsx:60-62,72,106,181` — `useState<any>`, `function(o: any)` |
| Clients | 3 | `client-dialog.tsx:29` (`zodResolver as any`), `use-clients.ts:242-247` (document types) |
| Produits | 4 | `produit-form-page.tsx:40,57,81,83,176,486` — `Record<string, any>`, `useState<any>` |
| Facture | 1 | `facture-detail-client.tsx:120` — `onError: (err: { message: any })` |

**Impact**: Defeats TypeScript's value. Runtime errors from wrong field access won't be caught at compile time.

### 2.4 useEffect + Raw Fetch Violations (MEDIUM — State Management)

**Finding**: Several components bypass TanStack Query by using `fetch()` inside `useEffect`:

| File | Line | What it fetches |
|------|------|-----------------|
| `components/atelier/nouveau-of-dialog.tsx` | 47-56 | `GET /api/products?limit=500` |
| `components/effets/nouvel-effet-client.tsx` | 94,196,308 | Multiple effect-related endpoints |
| `components/command-palette.tsx` | 97 | `GET /api/search` |
| `components/layout/notifications-popover.tsx` | 29 | `GET /api/notifications` |
| `components/produits/produit-form-page.tsx` | 104-108 | `GET /api/products/next-code` |
| `components/produits/product-fiches-list.tsx` | 28 | `GET /api/products/{id}/fiches` |

**Impact**: No caching, no deduplication, no background refetch, no error retry. Each render triggers a new fetch. Violates the project's own CODE RULES.

### 2.5 Dead Code (LOW — Maintenance Burden)

| File | Status |
|------|--------|
| `hooks/use-clients-queries.ts` (80 lines) | Never imported by any component |
| `hooks/use-invoices-search.ts` (18 lines) | Superseded by `useInvoiceSearchDebounce` in `use-invoices.ts` |
| `components/clients/client-info-card.tsx` (195 lines) | Replaced by sidebar + header pattern |
| `app/(app)/atelier/commandes/page.tsx` | Empty stub |
| `app/(app)/atelier/fiche-technique/page.tsx` | Empty stub |
| `app/(app)/atelier/page.tsx` | Placeholder text only |

### 2.6 Missing Backend Status Validation (HIGH — Data Integrity)

**Finding**: The Atelier OF status transitions (BROUILLON → CONFIRME → EN_COURS → TERMINE → ANNULE) are enforced **only in the frontend** via `NEXT_STATUT` map. The PUT endpoint accepts any valid enum value without checking the current status.

A direct API call can jump from BROUILLON to TERMINE, or from TERMINE back to BROUILLON. The same issue exists for Invoice status transitions — the PATCH endpoint validates `CONFIRMED_STATUSES` and `ANNULLED_STATUSES` for stock purposes, but doesn't enforce the state machine order.

**Impact**: Status transitions are part of financial/business logic. Uncontrolled transitions could skip required steps (e.g., sending an invoice without it being validated).

### 2.7 OF Code Generation Race Condition (MEDIUM)

**Finding**: `app/api/ordres-fabrication/route.ts:104-118` generates OF codes using:
```typescript
const last = await prisma.ordreFabrication.findFirst({
    where: { companyId },
    orderBy: { createdAt: "desc" },
});
const nextNum = last ? parseInt(last.code.split("-").pop()!) + 1 : 1;
```

This is not atomic. Two concurrent POST requests can read the same `last` and generate the same code, violating the unique constraint. Compare with `lib/sequence.ts` which uses `prisma.sequence.upsert` — atomic and race-condition-safe.

**Impact**: Duplicate OF codes in production if two users create OFs simultaneously.

### 2.8 Synchronous File I/O in API Routes (MEDIUM)

**Finding**: Multiple API routes use `fs.readFileSync`, `fs.existsSync`, and `fs.writeFileSync`:

| File | Operation |
|------|-----------|
| `app/api/packing-list/[id]/pdf/route.ts` | `fs.existsSync` + `fs.readFileSync` for PDF serving |
| `app/api/packing-list/[id]/etiquettes/route.ts` | Same pattern |
| `app/api/ordres-fabrication/[id]/fiche-technique/route.ts` | `fs.readFileSync` for HTML serving |

**Impact**: Blocks the Node.js event loop during file reads. Under concurrent load, this degrades response times for all requests on the same worker.

### 2.9 Invoice List: 5 Separate DB Queries (LOW)

**Finding**: `GET /api/invoices` runs 1 `findMany` + 4 `Promise.all` aggregates (total TTC, paid count, pending sum+count, overdue sum+count). All 4 aggregates share the same base `where` clause.

**Impact**: 5 round-trips to PostgreSQL instead of 1-2. Minor for now, but scales poorly with connection pool pressure.

### 2.10 Solde Computation Duplication (MEDIUM)

**Finding**: The client solde (grand-livre) computation — fetch invoices, payments, avoirs, mouvements, sort by date, compute running balance — is implemented identically in:
- `app/api/clients/[id]/solde/route.ts` (lines 29-118)
- `app/api/clients/[id]/envoyer-rappel/route.ts` (lines 28-75)
- `app/api/fournisseurs/[id]/solde/route.ts` (similar pattern)

**Impact**: Bug fix in one doesn't propagate. The same logic for `tiers.findUnique` inside `checkClientBlocage` queries the same client that was already fetched in the parent route.

### 2.11 Missing Test Coverage (CRITICAL)

**Finding**: Zero automated tests exist in the project. No unit tests, no integration tests, no E2E tests.

**Impact**: Every refactoring carries regression risk. Financial calculations (TVA, FODEC, retenue, timbre fiscal, Big.js arithmetic) are the highest-risk area — a rounding error or sign flip could produce incorrect invoices with legal/tax consequences.

### 2.12 Multiple Similar Stores for Exports (LOW)

**Finding**: The Export module has 5 store files:
- `lib/stores/export-store.ts`
- `lib/stores/export-store-create.ts`
- `lib/stores/export-store-edit.ts`
- `lib/stores/export-store-list.ts`
- `lib/stores/export-store-shared.ts`

Other modules use a single store file. This over-decomposition suggests the Export module was built incrementally without consolidating.

### 2.13 Stock POST Route Not Atomic (CRITICAL — Data Integrity)

**Finding**: `app/api/products/[id]/stock-mouvements/route.ts:78-92` performs `stockMovement.create` and `product.update` as **two separate sequential queries**, NOT wrapped in a `$transaction`. If the server crashes between the two, a stock movement record exists without the product's `stockActuel` being updated.

Compare with `lib/stock-utils.ts:109` which correctly uses `prisma.$transaction` for the same kind of operation.

Additionally, the `stockStatus` recalculation (lines 103-114) is done **after** the product update outside any transaction, meaning concurrent requests can read stale data.

**Impact**: Data inconsistency under crash or concurrent load. The `handleSaleStockMovement` function in `stock-utils.ts` does this correctly — the manual route does not.

### 2.14 Missing Multi-Tenancy on Stock Routes (CRITICAL — Security)

**Finding**: 3 of 4 Stock API routes lack `companyId` scoping:
- `app/api/stock-mouvements/route.ts` — fetches ALL stock movements globally
- `app/api/inventaire/route.ts` — fetches ALL products globally
- `app/api/products/[id]/stock-mouvements/route.ts` — relies only on product ID

Compare with `app/api/reports/route.ts:9` which properly uses `apiRoute.get({ requireCompany: true })`.

**Impact**: In a multi-tenant deployment, users could see stock data from other companies.

### 2.15 Effets God Component (HIGH — Maintainability)

**Finding**: `components/effets/nouvel-effet-client.tsx` is **1,141 lines** — the largest component in the entire codebase. It contains:
- Module-level mutable state: `export let effetFormData: EffetFormData` (line 78) — bypasses React's state model entirely
- `forceUpdate` anti-pattern: `const [, forceUpdate] = useState(0)` (line 152) to trigger re-renders after mutating module-level state
- 15+ `useState` variables
- 3 raw `fetch()` calls (some inside `useQuery` queryFn, some in handlers)

The related `effet-detail-client.tsx` (671 LOC) has **state updates during render phase** (`setPrefilledTmm`/`setActionData` in component body, lines 86-97).

**Impact**: This is the hardest component to modify or debug. The module-level mutable state creates race conditions across tabs/hot reloads. The `forceUpdate` pattern is a known React anti-pattern.

### 2.16 Effets Batch Route Without Transaction (HIGH — Data Integrity)

**Finding**: `app/api/effets/batch/route.ts:50-78` creates multiple effets in a `for` loop without a Prisma `$transaction`. If one creation fails midway, partial data remains in the database with no rollback.

**Impact**: Inconsistent state — some effets created, others not, with no way to retry atomically.

### 2.17 Check-Echeances: Mutations in GET Route (HIGH — Architecture)

**Finding**: `app/api/effets/check-echeances/route.ts:48-89` is a GET request that performs mutations:
- Updates DB (`prisma.effet.update`, line 59)
- Queries users (`prisma.user.findMany`, line 65)
- Creates notifications (`prisma.notification.createMany`, line 71)
- Sends emails (`sendEmail`, line 83)

All inside a GET handler. This violates HTTP semantics and makes the operation non-idempotent.

**Impact**: Slow with many effets (N+1 queries + side effects). GET should be safe/idempotent. This should be a POST/PUT or a background job.

### 2.18 POS Module Non-Functional (MEDIUM — Feature Gap)

**Finding**: The POS module is a UI shell only:
- `components/pos/pos-client.tsx:174` — "Valider la vente" button has **no `onClick` handler**
- No API routes exist under `app/api/pos/` or `app/api/caisse/`
- No sale record creation, no payment processing, no receipt generation, no stock deduction
- Cart has no stock validation (can add unlimited quantity regardless of `stockActuel`)
- No FODEC calculation in cart totals (Tunisian fiscal compliance requires FODEC)

**Impact**: The module is not usable in production. It needs full backend implementation.

### 2.19 Duplicate Hook Files (LOW — Maintenance)

**Finding**: Multiple modules have duplicate hook files providing overlapping functionality:
- Chèques: `use-cheques.ts` + `use-cheques-queries.ts` (identical `ChequesResponse` interface, overlapping query functions)
- Exports: `use-exports.ts` + `use-exports-queries.ts` (overlapping CRUD hooks)

**Impact**: Confusion about which hook to use. Dead code if one is never imported.

### 2.20 Rapports "Last Month" Logic Bug (MEDIUM — Fiscal Compliance)

**Finding**: `app/api/reports/route.ts:131-135`:
```typescript
const lastMonthInvs = yearInvoices.filter((inv) => {
    const d = new Date(inv.dateEmission);
    return d.getMonth() + 1 === currentMonth - 1 || currentMonth === 1;
});
```

When `currentMonth === 1` (January), the `|| currentMonth === 1` condition matches ALL invoices in January — not December of last year. This produces an **incorrect TEJ XML declaration** with current month data instead of previous month.

**Impact**: Fiscal compliance violation. The TEJ XML export produces wrong data for January reports.

### 2.21 Duplicate Inventory Endpoints (LOW — Maintenance)

**Finding**: Two nearly identical inventory endpoints and hooks exist:
- `app/api/inventaire/route.ts` (122 LOC) + `hooks/use-inventaire.ts` (55 LOC)
- `app/api/rapports/inventaire/route.ts` (83 LOC) + `hooks/use-rapport-inventaire.ts` (37 LOC)

They serve very similar data for different UIs with slightly different shapes.

**Impact**: Bug fix in one doesn't propagate. Consolidation would reduce maintenance burden.

### 2.22 Export PATCH Missing Zod Validation (MEDIUM — Security)

**Finding**: `app/api/exports/[id]/route.ts:41` destructures the body directly without Zod validation. All other routes in the app use `safeParse`.

**Impact**: Invalid or malicious data can reach the database. Server-side validation is a defense-in-depth measure.

### 2.23 Export Lines Replace Without Transaction (MEDIUM — Data Integrity)

**Finding**: `app/api/exports/[id]/route.ts:52-70` deletes all existing lines then creates new ones in two separate Prisma calls. If the create fails, lines are lost.

**Impact**: Data loss on partial failure. Should be wrapped in `$transaction`.

### 2.24 Customizer: Three.js CanvasTexture Memory Leak (MEDIUM — Performance)

**Finding**: `components/customizer/mockup/mockup-3d.tsx:30-35` creates a `THREE.CanvasTexture` in a `useRef` but never calls `.dispose()` on unmount. The texture is created outside the R3F lifecycle, so R3F's scene cleanup doesn't reclaim it. Repeated open/close cycles of the 3D preview accumulate GPU memory.

**Impact**: Prolonged use degrades browser performance; low-VRAM machines may crash the tab.

### 2.25 Customizer: Undo/Redo Buttons Are Dead UI (LOW — UX)

**Finding**: `components/customizer/canvas/design-canvas.tsx:288-294` renders Undo/Redo buttons with no `onClick` handlers. `canvas-store.ts` has `pushHistory`/`undo`/`redo` methods, but nothing calls `pushHistory` on layer edits. The history array is always empty.

**Impact**: Users see undo/redo buttons and assume the feature exists, then lose work.

### 2.26 Customizer: Canvas Does Not Resize on Window Resize (MEDIUM — UX)

**Finding**: `components/customizer/canvas/design-canvas.tsx:308-309` reads `containerRef.current?.clientWidth/Height` at render time with no `ResizeObserver`. Canvas dimensions are frozen at mount time.

**Impact**: On responsive layouts or split-screen, the canvas may be clipped or have empty space.

### 2.27 Customizer: Embroidery Stitch Pattern Regenerated Every Render (MEDIUM — Performance)

**Finding**: `components/customizer/canvas/design-canvas.tsx:421-429` calls `generateStitchPattern()` directly in the render body without memoization. Each re-render (even from unrelated zoom/pan state changes) recalculates all stitch lines. For tatami stitches at density 8, this generates hundreds of line objects per layer per render.

**Impact**: Noticeable lag when working with embroidery layers, especially during drag operations.

### 2.28 Customizer: Design GET [id] Missing companyId Filter (HIGH — Security)

**Finding**: `app/api/designs-personnalises/[id]/route.ts:17-25` fetches a design by ID without filtering by `companyId`. POST/PUT/DELETE all use `companyId`, but GET leaks design data across tenants. Any authenticated user can read any design by UUID.

**Impact**: Cross-tenant data leakage of proprietary design files (layer data, thumbnails, product info).

### 2.29 Planning: Drag-End Uses Activator Event Coordinates (HIGH — Functional Bug)

**Finding**: `components/planning/gantt-chart.tsx:326-336` calculates the new time from `event.activatorEvent` (the mouse event that *started* the drag), not the actual drop position. The slot always jumps to the start-of-drag time regardless of where the user drags it to.

**Impact**: Users cannot accurately reposition OFs on the timeline — the time is always wrong.

### 2.30 Planning: Production Lines Hardcoded, Not from Database (MEDIUM — Feature Gap)

**Finding**: `components/planning/planning-client.tsx:48-53` defines production lines as hardcoded constants (`Ligne 1`, `Ligne 2`, etc.). No database table, API endpoint, or settings UI exists to configure them. `planningRowId` on OFs references these hardcoded IDs, so changing them breaks existing data.

**Impact**: The planning module cannot be used by companies with different production line configurations.

### 2.31 Planning: Conflict Detection Is Visual Only (MEDIUM — Data Integrity)

**Finding**: `components/planning/gantt-chart.tsx:265-285` renders a red ring for conflicts but never prevents overlaps. `onSlotUpdate` is called without conflict checking. Two OFs can be placed on the same line at the same time.

**Impact**: Production managers could schedule two jobs simultaneously on the same line.

### 2.32 Stock: Inventaire Endpoint Missing companyId Filter (HIGH — Security)

**Finding**: `app/api/inventaire/route.ts:19-33` fetches ALL active products without `companyId` filtering. `mouvementStats` and `recentMovements` also lack company scoping.

**Impact**: Users see inventory data from other companies — severe data isolation breach. (Extends 2.14 which only covers stock mutations, not inventory reads.)

### 2.33 Stock: Stock Valuation Ignores Variant-Level Stock (MEDIUM — Data Accuracy)

**Finding**: `app/api/inventaire/route.ts:51-54` sums `prixHT * stockActuel` for parent products only. Variant stock (`product_variants.stockActuel`) is not counted. Products tracked at variant level (sizes/colors) have incorrect valuation.

**Impact**: Stock valuation is understated for companies using product variants.

### 2.34 Rapports: TEJ XML Is a Stub (HIGH — Fiscal Compliance) — ✅ RESOLVED

**Finding**: `app/api/reports/route.ts:150-160` generates TEJ XML with `<Factures>` containing literal `"..."` strings instead of actual invoice data. Only 3 placeholder entries are generated regardless of invoice count.

**Impact**: The TEJ XML download produces a non-functional fiscal declaration file. Business-critical feature that doesn't work.

**Resolution** (2026-09-06): Replaced stub with real invoice data generation. Each invoice now includes Numero, Date, Fournisseur (XML-escaped), MontantHT, TVA, FODEC, Retenue, MontantTTC. Added `<NombreFactures>` element. Added `escapeXml()` helper for safe supplier names.

### 2.35 Rapports: Monthly CA Uses HT While Annual Uses TTC (MEDIUM — Data Consistency)

**Finding**: `app/api/reports/route.ts:49-51` computes annual CA with `totalTTC`, but the monthly chart (line 88-91) uses `totalHT`. The chart Y-axis and headline stat are on different bases.

**Impact**: Monthly chart shows lower values than expected based on the headline CA, confusing fiscal reporting.

### 2.36 POS: No FODEC Calculation in Cart Totals (HIGH — Fiscal Compliance)

**Finding**: `lib/stores/pos-store.ts:31-41` computes `computeLineTotal` with only TVA. FODEC (1% tax mandatory in Tunisia) is completely ignored. Any POS sale would produce incorrect totals.

**Impact**: POS sales produce invoices with wrong tax amounts, violating Tunisian fiscal law.

### 2.37 POS: No Stock Validation in Cart (MEDIUM — Data Integrity)

**Finding**: `components/pos/pos-client.tsx:50-52` allows adding any active product to the cart regardless of `stockActuel`. The `addToCart` function doesn't check stock levels.

**Impact**: Overselling is possible, leading to negative inventory without guard.

### 2.38 POS: Product Search Not Debounced (MEDIUM — Performance)

**Finding**: `components/pos/pos-client.tsx:16` passes `searchQuery` directly to `useProducts()` with no debounce. Each keystroke triggers a new API fetch (typing "t-shirt" fires 7 queries).

**Impact**: Excessive API calls; poor performance on slow connections.

### 2.39 Cheques: Encaisser Creates Payment with Wrong Method (MEDIUM — Data Accuracy)

**Finding**: `app/api/cheques/[id]/encaisser/route.ts:38,51` hardcodes `methode: "VIREMENT"` when creating payments. For a cheque, the method should be `"CHEQUE"`.

**Impact**: Financial reports show cheque payments as wire transfers, breaking method-based reporting.

### 2.40 Cheques: Encaisser Flow Not Atomic (HIGH — Data Integrity)

**Finding**: `app/api/cheques/[id]/encaisser/route.ts:28-71` creates a payment (line 34-44 or 46-58) and updates the cheque status (line 65-68) as separate statements without `$transaction`. If the cheque update fails after payment succeeds, an orphaned payment exists.

**Impact**: Inconsistent state between payments and cheques on partial failure.

### 2.41 Cheques: Non-Null Assertion on tiersId (MEDIUM — Reliability)

**Finding**: `app/api/cheques/[id]/encaisser/route.ts:49` uses `existing.tiersId!` — the field is optional in the schema. If `tiersId` is null, this causes a runtime crash.

**Impact**: Server 500 error if a cheque without a linked tiers is encaissed.

### 2.42 Effets: set() Calls During Render Cause Cascading Re-Renders (MEDIUM — Performance)

**Finding**: `components/effets/nouvel-effet-client.tsx:170-181` calls `set()` (which triggers `forceUpdate`) during the render body when company data doesn't match form state. Each `set()` triggers another render, potentially creating infinite loops.

**Impact**: React performance warnings; potential infinite renders; UI jank.

### 2.43 Effets: check-echeances Sends Emails to ALL Users for EACH Effect (HIGH — Performance/Security)

**Finding**: `app/api/effets/check-echeances/route.ts:65-85` queries all active users per effet and sends both a notification AND an email to each. With 10 effets and 20 users, that's 200 emails per GET request. This runs every 5 minutes via client `refetchInterval`.

**Impact**: Email bombardment; SMTP throttling/blacklisting; high server load.

### 2.44 Effets: PATCH Allows Arbitrary Status Transitions (HIGH — Data Integrity)

**Finding**: `app/api/effets/[id]/route.ts:50-51` accepts any status value without transition validation. `PAYE -> EN_PORTEFEUILLE` or `ANNULE -> EN_PORTEFEUILLE` are not blocked. Only `PAYE -> PAYE` is checked.

**Impact**: Users can revert paid effets to open status, creating accounting inconsistencies.

### 2.45 Exports: POST Endpoint Has No Zod Validation (MEDIUM — Security)

**Finding**: `app/api/exports/route.ts:54-110` accepts arbitrary body data with no schema validation. `tiersId` is required but not validated. Line fields are cast with `as string`/`as number` without checks.

**Impact**: Runtime crashes or silent data corruption on malformed input.

### 2.46 Exports: Permission Model Uses bonLivraison Permissions (MEDIUM — Security)

**Finding**: All export endpoints use `bonsLivraison:*` permissions instead of export-specific ones. Users with delivery note permissions automatically get export access.

**Impact**: Permission model is semantically wrong; couples two unrelated business domains.

### 2.47 Paramètres: API Keys Stored/Returned in Plaintext (HIGH — Security)

**Finding**: `app/api/settings/app/route.ts:44-48` stores OpenAI, Gemini, and Mistral API keys as plaintext in the database. GET returns the full settings object including all keys. Any user with `parametres:voir` can read them.

**Impact**: API key exposure; potential abuse/billing fraud if keys leak.

### 2.48 Paramètres: Company DELETE Only Checks Invoices (MEDIUM — Data Integrity)

**Finding**: `app/api/companies/[id]/route.ts:103-115` guards deletion by counting invoices only. Deleting a company with existing effets, cheques, exports, or designs will cascade-delete or orphan those records without warning.

**Impact**: Silent destruction of financial records on company deletion.

---

## 3. REFACTORING STRATEGY

### Priority Matrix

| # | Problem | Effort | Risk | Order | Prerequisite |
|---|---------|--------|------|-------|--------------|
| 1 | Add tests for financial calcs | S | — | **FIRST** | None (enables all below) |
| 2 | Extract `calcLineTotals` to shared util | S | Low | 2 | Tests from #1 |
| 3 | Migrate clients routes to apiRoute | M | Low | 3 | Tests from #1 |
| 4 | Migrate products/categories/marques routes to apiRoute | M | Low | 4 | Tests from #1 |
| 5 | Fix `any` types (atelier hooks first) | M | Low | 5 | None |
| 6 | Replace raw fetch with TanStack Query | M | Low | 6 | None |
| 7 | Add backend status transition validation | M | Medium | 7 | Tests from #1 |
| 8 | Fix OF code generation race condition | S | Low | 8 | None |
| 9 | Extract solde computation to shared util | S | Low | 9 | Tests from #1 |
| 10 | Replace sync fs with async | S | Low | 10 | None |
| 11 | Delete dead code | S | None | 11 | None |
| 12 | Consolidate export stores | M | Low | 12 | Tests from #1 |
| 13 | Fix stock POST route: wrap in $transaction | S | Low | 13 | Tests from #1 |
| 14 | Add companyId to stock routes | S | Low | 14 | None |
| 15 | Decompose effets god component (1,141 LOC) | L | Medium | 15 | Tests from #1 |
| 16 | Wrap effets batch in $transaction | S | Low | 16 | Tests from #1 |
| 17 | Convert check-echeances to POST + background job | M | Medium | 17 | Tests from #1 |
| 18 | Fix rapports "last month" logic bug | S | Low | 18 | None |
| 19 | Add server-side Zod validation to exports PATCH | S | Low | 19 | None |
| 20 | Wrap export lines replace in $transaction | S | Low | 20 | Tests from #1 |
| 21 | Split gantt-chart.tsx (551 LOC) into sub-components | M | Low | 21 | None |
| 22 | Split design-canvas.tsx (531 LOC) into sub-components | M | Low | 22 | None |
| 23 | Delete duplicate hooks (cheques, exports) | S | None | 23 | None |
| 24 | Remove module-level mutable state in nouvel-effet | M | Medium | 24 | Tests from #1 |
| 25 | Fix stock-status recalculation to use $transaction | S | Low | 25 | Tests from #1 |
| 26 | Fix planning drag-end: use drop position, not activator | S | Low | 26 | None | ✅ DONE |
| 27 | Fix cheque encaisser: methode "CHEQUE" + wrap in $transaction | S | Low | 27 | Tests from #1 | ✅ DONE |
| 28 | Fix POS: add FODEC calculation, stock validation, debounce | M | Low | 28 | Tests from #1 | ✅ DONE |
| 29 | Fix design GET [id]: add companyId filter | S | Low | 29 | None | ✅ DONE |
| 30 | Fix cheques/inventaire GET: add companyId + pagination | M | Low | 30 | None | ⚠️ Partial (apiRoute refactor done, models intentionally global) |
| 31 | Encrypt API keys at rest + mask in GET responses | M | Medium | 31 | None | ✅ DONE (mask only, encryption deferred) |
| 32 | Fix TEJ XML: implement actual invoice data generation | L | Medium | 32 | Tests from #1 | ✅ DONE |
| 33 | Fix effets check-echeances: deduplicate emails, add rate limit | M | Low | 33 | None | ✅ DONE |
| 34 | Add status transition validation to effets PATCH | M | Medium | 34 | Tests from #1 | ✅ DONE |
| 35 | Fix export POST: add Zod validation | S | Low | 35 | None | ✅ DONE |
| 36 | Fix export permissions: use exports:* instead of bonsLivraison:* | S | Low | 36 | None |
| 37 | Fix company DELETE: check all related records | S | Low | 37 | None | ✅ DONE |
| 38 | Dispose Three.js CanvasTexture on unmount | S | Low | 38 | None | ✅ DONE |
| 39 | Memoize embroidery stitch pattern generation | S | Low | 39 | None | ✅ DONE |
| 40 | Add ResizeObserver to customizer canvas | S | Low | 40 | None |
| 41 | Make production lines configurable (DB + settings UI) | M | Medium | 41 | None |
| 42 | Implement planning conflict prevention (not just visual) | M | Medium | 42 | None |
| 43 | Fix rapports: monthly CA should use TTC like annual | S | Low | 43 | None |
| 44 | Fix cheque date validation: echeance >= emission | S | Low | 44 | None |
| 45 | Fix effets: move set() calls to useEffect | S | Low | 45 | None |

### Detailed Proposals

#### #1 — Add Tests for Financial Calculations (Effort: S, Risk: —)

**What**: Unit tests for `lib/decimal.ts` functions (`calcLineHT`, `calcTVA`, `calcFodec`, `calcRetenue`, `formatTND`, `parseTunisianNumber`) and the `calcLineTotals` pattern. Integration tests for `lib/invoice-payment.ts` (`applyPaymentToInvoice`), `lib/stock-utils.ts` (`handleSaleStockMovement`), and `lib/check-client-blocage.ts`.

**Why first**: Every subsequent refactoring of financial logic is blind without tests. A single rounding error in TVA calculation produces legally non-compliant invoices.

**Suggested tooling**: Vitest (already compatible with Next.js, fast, zero-config for TypeScript).

#### #2 — Extract `calcLineTotals` (Effort: S, Risk: Low)

**What**: Create `lib/calc-line-totals.ts` with a single canonical implementation. Replace all 8+ copy-pasted versions in components.

**Complexity**: The function has variants — some callers pass `clientExonereTVA` to skip TVA, some don't. The shared version should accept an optional `exonereTVA` parameter.

#### #3-4 — Migrate Routes to apiRoute (Effort: M, Risk: Low)

**What**: Convert the ~56 manual-auth routes to use `apiRoute.get/post/put/patch/delete`. The pattern is mechanical: replace the manual `getSessionFromRequest` + `checkPermission` block with the wrapper config.

**Order**: Start with `clients/` (8 routes, well-understood), then `products/` (11 routes), then `categories/`, `marques/`, `fournisseurs/`, `users/`, `settings/`, `companies/`.

#### #5 — Fix `any` Types (Effort: M, Risk: Low)

**What**: Replace all `any` with proper types. Priority targets:
1. Atelier hooks: create proper `OrdreFabrication`, `PackingList`, `MatierePremiere` return types
2. Atelier components: type the `useState<any>` hooks
3. Clients: type the document return types in `useClientDocuments`
4. Produits: type the `product` prop in `ProduitFormPage`

#### #6 — Replace Raw Fetch with TanStack Query (Effort: M, Risk: Low)

**What**: Convert each `fetch()` in `useEffect` to a proper `useQuery` hook. Target files:
- `nouveau-of-dialog.tsx` → create `useProductsList` hook
- `notifications-popover.tsx` → create `useNotifications` hook
- `command-palette.tsx` → create `useSearch` hook
- `produit-form-page.tsx` → use existing `useQuery` pattern for next-code

#### #7 — Backend Status Validation (Effort: M, Risk: Medium)

**What**: Add a `validateStatusTransition(current, next, allowedTransitions)` function. Apply it in PUT/PATCH handlers for OF and Invoice statuses.

**Risk**: Medium because it changes API behavior. Frontend already guards transitions, so this is defense-in-depth. But if the frontend has bugs, the backend guard catches them — which is the point.

#### #8 — Fix OF Code Race Condition (Effort: S, Risk: Low)

**What**: Replace the `findFirst` + string parsing with `nextNumber()` from `lib/sequence.ts`, which uses atomic PostgreSQL upsert.

#### #9 — Extract Solde Computation (Effort: S, Risk: Low)

**What**: Create `lib/calculate-solde.ts` with the shared grand-livre computation. Replace the duplicated logic in `clients/[id]/solde/route.ts`, `clients/[id]/envoyer-rappel/route.ts`, and `fournisseurs/[id]/solde/route.ts`.

#### #10 — Replace Sync fs with Async (Effort: S, Risk: Low)

**What**: Replace `fs.existsSync` → `fs.promises.access`, `fs.readFileSync` → `fs.promises.readFile`, `fs.writeFileSync` → `fs.promises.writeFile`. These are drop-in replacements in async handlers.

#### #11 — Delete Dead Code (Effort: S, Risk: None)

**What**: Remove `hooks/use-clients-queries.ts`, `hooks/use-invoices-search.ts`, `components/clients/client-info-card.tsx`, and the empty atelier page stubs.

#### #12 — Consolidate Export Stores (Effort: M, Risk: Low)

**What**: Merge the 5 export store files into a single `lib/stores/export-store.ts` using the `createListStore` factory pattern already available.

#### #13 — Fix Stock POST Route Transaction (Effort: S, Risk: Low)

**What**: Wrap `app/api/products/[id]/stock-mouvements/route.ts:78-92` in `prisma.$transaction`. The `stockMovement.create`, `product.update`, and `recalculateStockStatus` should all execute atomically. Reuse `recalculateStockStatusTx` from `lib/stock-utils.ts` instead of the standalone version.

#### #14 — Add companyId to Stock Routes (Effort: S, Risk: Low) ✅ DONE (inventaire apiRoute refactor)

**What**: ~~Add `companyId` filtering to `app/api/stock-mouvements/route.ts` and `app/api/inventaire/route.ts`. Either migrate them to `apiRoute` wrapper (preferred) or add manual `companyId` scoping.~~ RESOLUTION: Product and StockMovement models are intentionally global (no companyId in schema — documented in audit-scope-multi-societe.md). The inventaire route has been refactored to use `apiRoute` wrapper with `requireCompany: false`.

#### #15 — Decompose Effets God Component (Effort: L, Risk: Medium)

**What**: Break `nouvel-effet-client.tsx` (1,141 LOC) into:
- `effet-form-provider.tsx` — form context + validation schema
- `effet-basic-fields.tsx` — montant, date, tiers, type
- `effet-echeance-panel.tsx` — echeance management + split
- `effet-document-links.tsx` — document association
- `effet-preview-dialog.tsx` — apercu (already partially extracted)

Remove module-level `export let effetFormData` and `forceUpdate` anti-pattern. Replace with proper Zustand store or form context.

Also decompose `effet-detail-client.tsx` (671 LOC) — extract tabs into separate components and fix state updates during render phase (lines 86-97).

#### #16 — Wrap Effets Batch in Transaction (Effort: S, Risk: Low)

**What**: Wrap `app/api/effets/batch/route.ts:50-78` in `prisma.$transaction`. All effet creations must succeed or all must roll back.

#### #17 — Convert Check-Echeances to POST + Background Job (Effort: M, Risk: Medium)

**What**: Move `app/api/effets/check-echeances/route.ts` from GET to POST. Better yet, convert to a background job (cron or queue) since it performs N+1 queries, DB updates, email sends, and notification creation. The current GET implementation is non-idempotent and blocks the response.

#### #18 — Fix Rapports "Last Month" Bug (Effort: S, Risk: Low)

**What**: Fix `app/api/reports/route.ts:131-135`. When `currentMonth === 1`, filter for month 12 of `year - 1` instead of matching all January data. Simple one-line fix.

#### #19 — Add Zod Validation to Export PATCH (Effort: S, Risk: Low)

**What**: Add a Zod schema for `app/api/exports/[id]/route.ts` PATCH body. Validate `status`, `decVente`, line fields, etc. before destructuring.

#### #20 — Wrap Export Lines Replace in Transaction (Effort: S, Risk: Low)

**What**: Wrap `app/api/exports/[id]/route.ts:52-70` (delete-all lines + create-many) in `prisma.$transaction`.

#### #21 — Split Gantt Chart (Effort: M, Risk: Low)

**What**: Extract from `gantt-chart.tsx` (551 LOC):
- `gantt-timeline-slot.tsx` — individual slot rendering
- `gantt-row-drop-zone.tsx` — row + drop target
- `gantt-drag-preview.tsx` — drag overlay
- `gantt-now-indicator.tsx` — current time line (memoized to avoid full re-render every 60s)

#### #22 — Split Design Canvas (Effort: M, Risk: Low)

**What**: Extract from `design-canvas.tsx` (531 LOC):
- `image-layer.tsx` — ImageLayerComponent
- `text-layer.tsx` — TextLayerComponent
- `embroidery-layer.tsx` — EmbroideryLayerComponent
- Move `useImageLoader` hook to its own file
- Memoize `sortedLayers` and stitch pattern generation

#### #23 — Delete Duplicate Hooks (Effort: S, Risk: None)

**What**: Remove `hooks/use-cheques-queries.ts` (keep `use-cheques.ts`) and `hooks/use-exports-queries.ts` (keep `use-exports.ts`). Verify no imports reference the deleted files first.

#### #24 — Remove Module-Level Mutable State in Effets (Effort: M, Risk: Medium)

**What**: Replace `export let effetFormData` + `forceUpdate` in `nouvel-effet-client.tsx` with a proper Zustand store or React context. The current pattern bypasses React's state model and creates race conditions across component instances.

#### #25 — Fix Stock Status Recalculation (Effort: S, Risk: Low)

**What**: In `app/api/products/[id]/stock-mouvements/route.ts`, replace the standalone `recalculateStockStatus` call with `recalculateStockStatusTx` inside the transaction, ensuring the status is computed from the same consistent snapshot as the stock update.

---

## 4. CROSS-REFERENCE: CODE RULES VIOLATIONS

See `docs/wiki/plan-corrections.md` for the full module-by-module count. Key findings from this review:

| Rule | Violations Found |
|------|-----------------|
| `any` (no-explicit-any) | **30+** across components/hooks/lib (was 18+, added: 12 customizer, 10 planning, 3 exports, 1 paramètres) |
| `useEffect` for data-fetching | **8+** instances (added: customizer-studio:178, use-effets:52, use-exports:42) |
| Raw `fetch()` bypassing TanStack | **13+** instances across components (added: customizer-studio:180, nouvel-effet:94,196,308) |
| `apiRoute` wrapper bypass | **53+ routes** use manual auth (DOWN from 56+ — settings/app ✅, inventaire ✅ fixed; stock-mouvements, rapports/inventaire remain) |
| Missing `$transaction` wrapping | ✅ ALL RESOLVED — stock POST, effets batch, export lines, cheques encaisser |
| Missing `companyId` multi-tenancy | **4** routes (DOWN from 5 — designs-personnalises/[id] ✅ fixed; stock-mouvements, inventaire, rapports/inventaire intentionally global) |
| Missing server-side Zod validation | **3** routes (DOWN from 5 — exports POST ✅, exports PATCH ✅ fixed; settings PUT, companies PATCH remain) |
| Module-level mutable state | **1** (`nouvel-effet-client.tsx:78` — `export let effetFormData`) |
| State updates during render | **1** (`effet-detail-client.tsx:86-97`) |
| Mutations in GET route | **1** (`effets/check-echeances/route.ts`) |
| Plaintext API keys | ✅ FIXED — GET now returns masked keys (last 4 chars visible) |
| Wrong payment method | ✅ FIXED — encaisser now uses `methode: "CHEQUE"` |
| Zustand for shared client state | ✅ Compliant — stores are correctly scoped to UI concerns |
| TanStack Query for server state | ✅ Mostly compliant — violations are the raw fetch cases above |

---

## 5. SCALABILITY RISKS

| Risk | Location | Trigger |
|------|----------|---------|
| Invoice list 5 queries | `GET /api/invoices` | >10K invoices, connection pool exhaustion |
| Sync file I/O | Packing list PDF/etiquettes routes | Concurrent PDF requests block event loop |
| OF code race condition | `POST /api/ordres-fabrication` | Two users creating OFs simultaneously |
| No pagination on some lists | Products, clients, categories (some endpoints) | >1K records |
| In-memory solde computation | `GET /api/clients/{id}/solde` | Client with >10K transactions |
| PDF generation on request | Packing list, fiche technique | First request latency spike |
| Stock POST not atomic | `POST /api/products/{id}/stock-movements` | Crash between create + update |
| Missing multi-tenancy on stock | `GET /api/stock-mouvements`, `GET /api/inventaire` | Multi-tenant deployment |
| Effets god component re-renders | `nouvel-effet-client.tsx` (1,141 LOC) | Every keystroke re-renders entire form |
| Check-echeances N+1 in GET | `GET /api/effets/check-echeances` | Many effets → slow response + side effects |
| Effets batch without transaction | `POST /api/effets/batch` | Partial failure leaves inconsistent data |
| Customizer base64 in memory | `upload-panel.tsx` stores data URLs | Large images → high memory usage |
| Gantt full re-render every 60s | `gantt-chart.tsx` useCurrentTime | All slots re-render for now-line update |
| Konva texture memory leak | `mockup-3d.tsx` CanvasTexture | Repeated modal opens → memory growth |
| POS cart no stock validation | `usePOSStore.addToCart` | Cashier adds more than available stock |
| Rapports last month bug | `GET /api/reports` filter | January TEJ XML exports wrong data |
| Planning drag-end wrong coordinates | `gantt-chart.tsx:332` activatorEvent | All OF repositioning produces wrong times |
| Cheques encaisser not atomic | `encaisser/route.ts:28-71` | Partial failure → orphaned payments |
| Effets check-echeances email flood | `check-echeances/route.ts:65-85` | 10 effets × 20 users = 200 emails per 5min |
| API keys in plaintext | `settings/app/route.ts:44-48` | Any settings viewer reads all API keys |
| Design GET cross-tenant leak | `designs-personnalises/[id]/route.ts:17` | Any user reads any design by UUID |
| Embroidery stitch re-computation | `design-canvas.tsx:421` render body | Hundreds of lines recalculated per render |
| POS no FODEC | `pos-store.ts:31-41` | Tunisian fiscal law violation on every sale |
| Company DELETE cascade risk | `companies/[id]/route.ts:103-115` | Only checks invoices, not effets/cheques/exports |

---

## 6. SUMMARY

**What's good**:
- Clean component/hook/store separation at the client layer
- TanStack Query used consistently for server state (with noted exceptions)
- Zustand correctly scoped to UI state (25+ stores, all minimal)
- `lib/decimal.ts` provides solid financial primitives with Big.js
- Atomic sequence generation via PostgreSQL upsert (where used)
- Prisma schema is well-indexed for common query patterns
- Multi-tenant isolation via `companyId` in most queries (exceptions noted)
- Chèques and Rapports modules are cleanest (0 `any` violations, proper patterns)
- Stock module client-side is exemplary (0 `any`, 0 `useEffect`, all TanStack Query)

**What needs attention** (in priority order):
1. **Zero tests** — the single biggest risk. Financial logic MUST have tests before any refactoring.
2. **~50 apiRoute non-compliance remaining** — security surface area, inconsistent error handling
3. **`calcLineTotals` in 8 places** — financial calculation duplication is a ticking bomb
4. **30+ `any` violations** — expanded count across customizer (12), planning (10), atelier (13+)
5. **Effets god component** (1,141 LOC) — module-level mutable state, forceUpdate anti-pattern, state updates during render
6. **Raw fetch in useEffect** — 8+ components bypass caching/retry/dedup
7. **OF code race condition** — ✅ RESOLVED (2026-09-06 — atomic nextNumber())
8. **POS module non-functional** — UI shell only, no backend, no sale processing (FODEC ✅ fixed in store)
9. **Rapports TEJ XML** — ✅ RESOLVED (2026-09-06 — real data + January bug fixed)
10. **Component monoliths** — 5 files exceed 500 LOC
11. **Planning drag-end bug** — ✅ RESOLVED (2026-09-06)
12. **API keys in plaintext** — ✅ RESOLVED (2026-09-06 — GET returns masked keys)
13. **Design GET cross-tenant leak** — ✅ RESOLVED (2026-09-06)
14. **Cheques encaisser wrong payment method** — ✅ RESOLVED (2026-09-06)
15. **Effets check-echeances email flood** — ✅ RESOLVED (2026-09-06 — cooldown + single email)
16. **Company DELETE incomplete guard** — ✅ RESOLVED (2026-09-06 — 20 relations checked)
17. **Stock valuation ignores variants** — ✅ RESOLVED (2026-09-06)
18. **CA mensuel uses HT** — ✅ RESOLVED (2026-09-06 — now uses TTC)
19. **CanvasTexture memory leak** — ✅ RESOLVED (2026-09-06 — dispose on unmount)
20. **Embroidery stitch recomputation** — ✅ RESOLVED (2026-09-06 — memoized in sub-component)
21. **Stock POST not atomic** — ✅ RESOLVED (2026-09-06 — $transaction)
22. **Effets batch without transaction** — ✅ RESOLVED (2026-09-06 — $transaction)
23. **Export lines not atomic** — ✅ RESOLVED (2026-09-06 — $transaction)
24. **No backend status validation** — ✅ RESOLVED (2026-09-06 — effets + invoices)
25. **Invoice status validation** — ✅ RESOLVED (2026-09-06 — VALID_INVOICE_TRANSITIONS)
18. **Customizer memory leak** — Three.js CanvasTexture never disposed on unmount
19. **Company DELETE incomplete guard** — only checks invoices, not effets/cheques/exports/designs
