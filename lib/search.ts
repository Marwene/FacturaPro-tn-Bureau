import { prisma } from "./prisma";

export interface SearchItem {
  id: string;
  label: string;
  subtitle: string;
  href: string;
  rank?: number;
}

export interface SearchGroup {
  module: string;
  moduleLabel: string;
  items: SearchItem[];
}

type ModuleSearcher = (q: string, companyId?: string | null) => Promise<SearchItem[]>;

function contains(q: string) {
  return { contains: q, mode: "insensitive" as const };
}

const searchers: Record<string, { label: string; search: ModuleSearcher }> = {
  clients: {
    label: "Clients",
    search: async (q) => {
      const res = await prisma.tiers.findMany({
        where: {
          isClient: true,
          OR: [
            { raisonSociale: contains(q) },
            { code: contains(q) },
            { email: contains(q) },
            { telephone: contains(q) },
            { matriculeFiscal: contains(q) },
            { ville: contains(q) },
          ],
          actif: true,
        },
        take: 8,
        orderBy: { raisonSociale: "asc" },
      });
      return res.map((c) => ({
        id: c.id,
        label: c.raisonSociale,
        subtitle: [c.code, c.ville].filter(Boolean).join(" · "),
        href: `/clients/${c.id}`,
      }));
    },
  },

  fournisseurs: {
    label: "Fournisseurs",
    search: async (q) => {
      const res = await prisma.tiers.findMany({
        where: {
          isFournisseur: true,
          OR: [
            { raisonSociale: contains(q) },
            { code: contains(q) },
            { email: contains(q) },
            { telephone: contains(q) },
            { matriculeFiscal: contains(q) },
            { ville: contains(q) },
          ],
          actif: true,
        },
        take: 8,
        orderBy: { raisonSociale: "asc" },
      });
      return res.map((f) => ({
        id: f.id,
        label: f.raisonSociale,
        subtitle: [f.code, f.ville].filter(Boolean).join(" · "),
        href: `/fournisseurs/${f.id}`,
      }));
    },
  },

  produits: {
    label: "Produits",
    search: async (q) => {
      const res = await prisma.product.findMany({
        where: {
          OR: [
            { nom: contains(q) },
            { code: contains(q) },
            { codeBarre: contains(q) },
            { description: contains(q) },
          ],
          actif: true,
        },
        take: 8,
        orderBy: { nom: "asc" },
        include: { categorie: { select: { nom: true } } },
      });
      return res.map((p) => ({
        id: p.id,
        label: p.nom,
        subtitle: [p.code, p.categorie?.nom].filter(Boolean).join(" · "),
        href: `/produits/${p.id}`,
      }));
    },
  },

  factures: {
    label: "Factures",
    search: async (q, companyId) => {
      const res = await prisma.invoice.findMany({
        where: {
          ...(companyId ? { companyId } : {}),
          OR: [
            { numero: contains(q) },
            { notes: contains(q) },
            { tiers: { raisonSociale: contains(q) } },
            { tiers: { code: contains(q) } },
          ],
        },
        take: 10,
        orderBy: { dateEmission: "desc" },
        include: { tiers: { select: { raisonSociale: true } } },
      });
      return res.map((f) => ({
        id: f.id,
        label: f.numero,
        subtitle: [f.tiers.raisonSociale, f.dateEmission.toLocaleDateString("fr-TN")].filter(Boolean).join(" · "),
        href: `/factures/${f.id}`,
      }));
    },
  },

  devis: {
    label: "Devis",
    search: async (q, companyId) => {
      const res = await prisma.quote.findMany({
        where: {
          ...(companyId ? { companyId } : {}),
          OR: [
            { numero: contains(q) },
            { notes: contains(q) },
            { tiers: { raisonSociale: contains(q) } },
            { tiers: { code: contains(q) } },
          ],
        },
        take: 10,
        orderBy: { dateCreation: "desc" },
        include: { tiers: { select: { raisonSociale: true } } },
      });
      return res.map((d) => ({
        id: d.id,
        label: d.numero,
        subtitle: d.tiers.raisonSociale,
        href: `/devis/${d.id}`,
      }));
    },
  },

  "bons-commande": {
    label: "Bons de commande",
    search: async (q, companyId) => {
      const res = await prisma.bonCommande.findMany({
        where: {
          ...(companyId ? { companyId } : {}),
          OR: [
            { numero: contains(q) },
            { notes: contains(q) },
            { tiers: { raisonSociale: contains(q) } },
            { tiers: { code: contains(q) } },
          ],
        },
        take: 10,
        orderBy: { dateCreation: "desc" },
        include: { tiers: { select: { raisonSociale: true } } },
      });
      return res.map((b) => ({
        id: b.id,
        label: b.numero,
        subtitle: b.tiers.raisonSociale,
        href: `/bons-commande/${b.id}`,
      }));
    },
  },

  "bons-livraison": {
    label: "Bons de livraison",
    search: async (q, companyId) => {
      const res = await prisma.bonLivraison.findMany({
        where: {
          ...(companyId ? { companyId } : {}),
          OR: [
            { numero: contains(q) },
            { notes: contains(q) },
            { tiers: { raisonSociale: contains(q) } },
            { tiers: { code: contains(q) } },
          ],
        },
        take: 10,
        orderBy: { dateCreation: "desc" },
        include: { tiers: { select: { raisonSociale: true } } },
      });
      return res.map((b) => ({
        id: b.id,
        label: b.numero,
        subtitle: b.tiers.raisonSociale,
        href: `/bons-livraison/${b.id}`,
      }));
    },
  },

  avoirs: {
    label: "Avoirs",
    search: async (q, companyId) => {
      const res = await prisma.avoir.findMany({
        where: {
          ...(companyId ? { companyId } : {}),
          OR: [
            { numero: contains(q) },
            { motif: contains(q) },
            { tiers: { raisonSociale: contains(q) } },
          ],
        },
        take: 10,
        orderBy: { dateEmission: "desc" },
        include: {
          tiers: { select: { raisonSociale: true } },
        },
      });
      return res.map((a) => ({
        id: a.id,
        label: a.numero,
        subtitle: a.tiers?.raisonSociale ?? "",
        href: `/avoirs/${a.id}`,
      }));
    },
  },

  achats: {
    label: "Achats",
    search: async (q, companyId) => {
      const res = await prisma.achat.findMany({
        where: {
          ...(companyId ? { companyId } : {}),
          OR: [
            { numero: contains(q) },
            { notes: contains(q) },
            { referenceFournisseur: contains(q) },
            { tiers: { raisonSociale: contains(q) } },
            { tiers: { code: contains(q) } },
          ],
        },
        take: 10,
        orderBy: { dateFacture: "desc" },
        include: { tiers: { select: { raisonSociale: true } } },
      });
      return res.map((a) => ({
        id: a.id,
        label: a.numero,
        subtitle: a.tiers.raisonSociale,
        href: `/achats/${a.id}`,
      }));
    },
  },

  paiements: {
    label: "Paiements",
    search: async (q, companyId) => {
      const res = await prisma.payment.findMany({
        where: {
          ...(companyId ? { companyId } : {}),
          OR: [
            { reference: contains(q) },
            { notes: contains(q) },
            { tiers: { raisonSociale: contains(q) } },
          ],
        },
        take: 10,
        orderBy: { dateReglement: "desc" },
        include: { tiers: { select: { raisonSociale: true } } },
      });
      return res.map((p) => ({
        id: p.id,
        label: p.reference ?? `Paiement #${p.id.slice(0, 8)}`,
        subtitle: `${p.tiers.raisonSociale} · ${p.montant.toString()} TND`,
        href: `/paiements`,
      }));
    },
  },

  exports: {
    label: "Exports",
    search: async (q, companyId) => {
      const res = await prisma.export.findMany({
        where: {
          ...(companyId ? { companyId } : {}),
          OR: [
            { numero: contains(q) },
            { notes: contains(q) },
            { tiers: { raisonSociale: contains(q) } },
          ],
        },
        take: 10,
        orderBy: { dateCreation: "desc" },
        include: { tiers: { select: { raisonSociale: true } } },
      });
      return res.map((e) => ({
        id: e.id,
        label: e.numero,
        subtitle: e.tiers.raisonSociale,
        href: `/exports/${e.id}`,
      }));
    },
  },
};

function rankItems(items: SearchItem[], q: string): SearchItem[] {
  const lower = q.toLowerCase();
  return items
    .map((item) => {
      const label = item.label.toLowerCase();
      let rank = 0;
      if (label === lower) rank = 3;
      else if (label.startsWith(lower)) rank = 2;
      else if (item.subtitle?.toLowerCase().includes(lower)) rank = 1;
      return { ...item, rank };
    })
    .sort((a, b) => b.rank - a.rank);
}

export async function searchAll(query: string, companyId?: string | null): Promise<SearchGroup[]> {
  if (!query.trim()) return [];

  const results = await Promise.allSettled(
    Object.entries(searchers).map(async ([module, { label, search }]) => {
      const items = await search(query, companyId);
      return items.length > 0 ? { module, moduleLabel: label, items: rankItems(items, query) } : null;
    }),
  );

  const groups: SearchGroup[] = [];
  for (const r of results) {
    if (r.status === "fulfilled" && r.value) groups.push(r.value);
  }
  return groups;
}

export async function searchModule(query: string, module: string, companyId?: string | null): Promise<SearchGroup | null> {
  if (!query.trim() || !searchers[module]) return null;
  const items = await searchers[module].search(query, companyId);
  if (items.length === 0) return null;
  return { module, moduleLabel: searchers[module].label, items: rankItems(items, query) };
}
