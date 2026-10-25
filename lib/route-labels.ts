export interface RouteConfig {
  label: string;
  labelNew?: string;
}

export const routeLabels: Record<string, RouteConfig> = {
  "/": { label: "Tableau de Bord" },
  "/clients": { label: "Clients" },
  "/devis": { label: "Devis", labelNew: "Nouveau Devis" },
  "/bons-commande": { label: "Bons de Commande", labelNew: "Nouveau Bon de Commande" },
  "/bons-livraison": { label: "Bons de Livraison", labelNew: "Nouveau BL" },
  "/factures": { label: "Factures", labelNew: "Nouvelle Facture" },
  "/avoirs": { label: "Avoirs", labelNew: "Nouvel Avoir" },
  "/pos": { label: "POS / Vente Rapide" },
  "/fournisseurs": { label: "Fournisseurs" },
  "/achats": { label: "Achats", labelNew: "Nouvel Achat" },
  "/rapports": { label: "Rapports" },
  "/paiements": { label: "Paiements" },
  "/cheques": { label: "Chèques" },
  "/effets": { label: "Effets de Commerce" },
  "/produits": { label: "Produits & Stock" },
  "/exports": { label: "Exports" },
  "/parametres": { label: "Paramètres" },
};
