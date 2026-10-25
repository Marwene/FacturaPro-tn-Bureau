/**
 * Registre central des query keys TanStack Query.
 *
 * Convention : chaque domaine expose `all()` (racine, pour invalidation large)
 * puis les variantes réelles utilisées par les hooks/composants. Les shapes
 * reproduisent À L'IDENTIQUE les clés historiques (arrays littéraux) pour que
 * la migration des hooks soit mécanique : aucun cache ni invalidation ne bouge.
 *
 * Cas documentés (ne pas « corriger » à l'aveugle, les deux racines coexistent
 * réellement dans le cache) :
 * - `bonsLivraison` : racine "delivery-notes" (use-bl) ET "deliveryNotes"
 *   (use-delivery-notes-queries).
 * - `stock` : racine "stock-movements" (use-stock-movements) ET
 *   "stock-mouvements" (use-stock-mouvements).
 * - `produits` : list 7 args (use-produits) ET listLegacy 4 args
 *   (use-products-queries / use-queries-shared).
 */
export const queryKeys = {
  achats: {
    all: () => ["achats"] as const,
    list: (search?: string, status?: string, type?: string, companyId?: string | null) =>
      ["achats", search, status, type, companyId] as const,
    bls: (tiersId: string, companyId?: string | null) => ["achats", "bls", tiersId, companyId] as const,
    detail: (id: string, companyId?: string | null) => ["achats", id, companyId] as const,
    scanTypeInit: (type: string) => ["achats-scan-type-init", type] as const,
  },

  avoirs: {
    all: () => ["avoirs"] as const,
    list: (search?: string, status?: string, companyId?: string | null) =>
      ["avoirs", search, status, companyId] as const,
    detail: (id: string, companyId?: string | null) => ["avoirs", id, companyId] as const,
  },

  bonsCommande: {
    all: () => ["bons-commande"] as const,
    list: (search?: string, status?: string, companyId?: string | null) =>
      ["bons-commande", search, status, companyId] as const,
    detail: (id: string, companyId?: string | null) => ["bons-commande", id, companyId] as const,
    rapprochement: (bcId: string, companyId?: string | null) =>
      ["bons-commande", bcId, "rapprochement", companyId] as const,
    produitsSelect: (limit: number) => ["of-products-select", limit] as const,
  },

  bonsLivraison: {
    all: () => ["delivery-notes"] as const,
    list: (search?: string, status?: string, companyId?: string | null) =>
      ["delivery-notes", search, status, companyId] as const,
    detail: (id: string, companyId?: string | null) => ["delivery-notes", id, companyId] as const,
    montantTnd: (totalTtc: string, tauxChange: string, viseActif: boolean, devise: string) =>
      ["bl-montant-tnd", totalTtc, tauxChange, viseActif, devise] as const,
    snNumbers: (bonLivraisonIds: string[]) =>
      ["bl-sn-numbers", ...[...bonLivraisonIds].sort()] as const,
    legacyAll: () => ["deliveryNotes"] as const,
    legacyList: (search?: string, status?: string, companyId?: string | null) =>
      ["deliveryNotes", search, status, companyId] as const,
    legacyDetail: (id: string, companyId?: string | null) =>
      ["deliveryNotes", id, companyId] as const,
  },

  cartonTypes: {
    all: () => ["carton-types"] as const,
    list: (companyId?: string | null) => ["carton-types", companyId] as const,
  },

  categories: {
    all: () => ["categories"] as const,
  },

  cheques: {
    all: () => ["cheques"] as const,
    list: (companyId?: string | null) => ["cheques", companyId] as const,
  },

  clients: {
    all: () => ["clients"] as const,
    list: (search?: string) => ["clients", search] as const,
    detail: (id: string) => ["clients", id] as const,
  },

  clientDetail: {
    detail: (id: string) => ["client-detail", id] as const,
    solde: (id: string, from?: string, to?: string) => ["client-solde", id, from, to] as const,
    documents: (id: string) => ["client-documents", id] as const,
  },

  companies: {
    all: () => ["companies"] as const,
    detail: (id: string | null) => ["company", id] as const,
    bankAccounts: (companyId?: string | null) => ["company-bank-accounts", companyId] as const,
    userCompaniesAll: () => ["user-companies"] as const,
    userCompanies: (userId?: string) => ["user-companies", userId] as const,
    me: () => ["me"] as const,
  },

  customizer: {
    productInit: (productId: string) => ["customizer-product-init", productId] as const,
    designInit: (designId?: string) => ["customizer-design-init", designId] as const,
  },

  dashboard: {
    all: (companyId?: string | null) => ["dashboard", companyId] as const,
  },

  devis: {
    all: () => ["quotes"] as const,
    list: (search?: string, status?: string, companyId?: string | null) =>
      ["quotes", search, status, companyId] as const,
    detail: (id: string, companyId?: string | null) => ["quotes", id, companyId] as const,
    montantTnd: (tauxChange: string, devise: string, totalTtc: string) =>
      ["devis-montant-tnd", tauxChange, devise, totalTtc] as const,
    dateExpirationInit: (dateCreation: string) =>
      ["devis-date-expiration-init", dateCreation] as const,
  },

  designsPersonnalises: {
    all: () => ["designs-personnalises"] as const,
  },

  effets: {
    all: () => ["effets"] as const,
    list: (search?: string, status?: string, companyId?: string | null, type?: string) =>
      ["effets", search, status, companyId, type] as const,
    emisList: (status?: string, companyId?: string | null) =>
      ["effets", "EMIS", status, companyId] as const,
    detail: (id: string, companyId?: string | null) => ["effet", id, companyId] as const,
    splits: (effetId: string) => ["effet-splits", effetId] as const,
    alertes: () => ["effets-alertes"] as const,
    documentsLies: (type: string, entityId: string) => ["documents-lies", type, entityId] as const,
    echeanceCollision: (date: string, companyId?: string | null) =>
      ["echeance-collision", date, companyId] as const,
    echeancesAVenir: (horizon: number | null, page: number, pageSize: number) =>
      ["echeances-a-venir", horizon ?? "all", page, pageSize] as const,
  },

  exports: {
    all: () => ["exports"] as const,
    list: (search?: string, status?: string, companyId?: string | null) =>
      ["exports", search, status, companyId] as const,
    detail: (id: string, companyId?: string | null) => ["exports", id, companyId] as const,
    blsWithVise: (tiersId: string, companyId?: string | null) =>
      ["bls", "vise", tiersId, companyId] as const,
  },

  fournisseurs: {
    all: () => ["fournisseurs"] as const,
    list: (search?: string) => ["fournisseurs", search] as const,
  },

  fournisseurDetail: {
    detail: (id: string) => ["fournisseur-detail", id] as const,
    documents: (id: string) => ["fournisseur-documents", id] as const,
    solde: (id: string, from?: string, to?: string) => ["fournisseur-solde", id, from, to] as const,
    echeances: (id: string) => ["fournisseur-echeances", id] as const,
  },

  inventaire: {
    list: (periode: string) => ["inventaire", periode] as const,
    rapport: (periode: string) => ["rapport-inventaire", periode] as const,
  },

  invoices: {
    all: () => ["invoices"] as const,
    list: (search?: string, status?: string, companyId?: string | null) =>
      ["invoices", search, status, companyId] as const,
    detail: (id: string, companyId?: string | null) => ["invoices", id, companyId] as const,
    payments: (invoiceId?: string) => ["payments", invoiceId] as const,
  },

  marques: {
    all: () => ["marques"] as const,
  },

  matieresPremieres: {
    all: () => ["matieres-premieres"] as const,
    detail: (id: string) => ["matieres-premieres", id] as const,
  },

  ngp: {
    codes: (companyId?: string | null) => ["ngp-codes", companyId] as const,
  },

  notifications: {
    all: () => ["notifications"] as const,
    unread: () => ["notifications", "unread"] as const,
  },

  ordresFabrication: {
    all: () => ["ordres-fabrication"] as const,
    detail: (id: string) => ["ordres-fabrication", id] as const,
  },

  packingLists: {
    all: () => ["packing-lists"] as const,
    detail: (id: string) => ["packing-lists", id] as const,
  },

  payments: {
    all: () => ["payments"] as const,
    byInvoice: (invoiceId?: string) => ["payments", invoiceId] as const,
    list: (
      search?: string,
      method?: string,
      status?: string,
      dateFrom?: string,
      dateTo?: string,
      companyId?: string | null,
    ) => ["payments", "list", search, method, status, dateFrom, dateTo, companyId] as const,
  },

  pendingBl: {
    all: () => ["pending-bl"] as const,
  },

  produits: {
    all: () => ["products"] as const,
    list: (
      search?: string,
      categorie?: string,
      stockStatus?: string,
      prixMin?: string,
      prixMax?: string,
      supplier?: string,
    ) => ["products", search, categorie, stockStatus, prixMin, prixMax, supplier] as const,
    listLegacy: (search?: string, categorie?: string, companyId?: string | null) =>
      ["products", search, categorie, companyId] as const,
    listForLabels: () => ["products", "all-for-labels"] as const,
    detail: (id: string) => ["product", id] as const,
    nextCode: (nom: string) => ["product-next-code", nom] as const,
    variants: (productId: string) => ["product-variants", productId] as const,
    stats: (productId: string) => ["product", "stats", productId] as const,
    fiches: (productId: string) => ["product", "fiches", productId] as const,
    supplierComparison: (productId: string) => ["supplier-comparison", productId] as const,
    priceHistory: (productId: string, supplierId: string) =>
      ["price-history", productId, supplierId] as const,
    suppliers: (productId: string) => ["product-suppliers", productId] as const,
    suppliersList: () => ["suppliers-list"] as const,
  },

  reports: {
    list: (year: string, companyId?: string | null) => ["reports", year, companyId] as const,
  },

  search: {
    global: (query: string, currentModule: string | null, selectedModule: string | null) =>
      ["search", query, currentModule, selectedModule] as const,
  },

  settings: {
    all: () => ["settings"] as const,
    app: () => ["app-settings"] as const,
    apiKeyStatus: () => ["api-key-status"] as const,
  },

  stock: {
    movements: (productId: string) => ["stock-movements", productId] as const,
    mouvements: (params: string) => ["stock-mouvements", params] as const,
  },

  taux: {
    bct: (devise: string) => ["taux-bct", devise] as const,
    bctBlSync: (devise: string, value: string | null | undefined) =>
      ["taux-bct-bl-sync", devise, value] as const,
    bctDevis: (devise: string) => ["taux-bct-devis", devise] as const,
    bctDevisSync: (devise: string, value: string | null | undefined) =>
      ["taux-bct-devis-sync", devise, value] as const,
    exchangeRate: (devise: string) => ["exchange-rate", devise] as const,
    tmmBct: () => ["tmm-bct"] as const,
  },

  tresorerie: {
    all: () => ["tresorerie"] as const,
    allRoots: ["tresorerie", "tresorerie-full", "tresorerie-evolution"] as const,
    list: (days: number, compte: string, companyId?: string | null) =>
      ["tresorerie", days, compte, companyId] as const,
    full: (days: number, compte: string, companyId?: string | null) =>
      ["tresorerie-full", days, compte, companyId] as const,
    evolution: (mois: number, flux: string, companyId?: string | null) =>
      ["tresorerie-evolution", mois, flux, companyId] as const,
  },

  users: {
    all: () => ["users"] as const,
  },
};
