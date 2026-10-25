export const PERMISSION_GROUPS = {
  dashboard: {
    label: "Dashboard",
    permissions: {
      "dashboard:voir": "Voir",
    },
  },
  search: {
    label: "Recherche globale",
    permissions: {
      "search:voir": "Voir",
    },
  },
  devis: {
    label: "Devis",
    permissions: {
      "devis:voir": "Voir",
      "devis:creer": "Créer",
      "devis:modifier": "Modifier",
      "devis:supprimer": "Supprimer",
      "devis:convertir": "Convertir en facture",
      "devis:exporter": "Exporter / Imprimer",
    },
  },
  factures: {
    label: "Factures",
    permissions: {
      "factures:voir": "Voir",
      "factures:creer": "Créer",
      "factures:modifier": "Modifier",
      "factures:supprimer": "Supprimer",
      "factures:exporter": "Exporter / Imprimer",
    },
  },
  avoirs: {
    label: "Avoirs",
    permissions: {
      "avoirs:voir": "Voir",
      "avoirs:creer": "Créer",
      "avoirs:modifier": "Modifier",
      "avoirs:supprimer": "Supprimer",
      "avoirs:exporter": "Exporter / Imprimer",
    },
  },
  bonsLivraison: {
    label: "Bons de livraison",
    permissions: {
      "bonsLivraison:voir": "Voir",
      "bonsLivraison:creer": "Créer",
      "bonsLivraison:modifier": "Modifier",
      "bonsLivraison:supprimer": "Supprimer",
    },
  },
  bonsDeCommande: {
    label: "Bons de commande",
    permissions: {
      "bonsDeCommande:voir": "Voir",
      "bonsDeCommande:creer": "Créer",
      "bonsDeCommande:modifier": "Modifier",
      "bonsDeCommande:supprimer": "Supprimer",
      "bonsDeCommande:valider": "Valider",
    },
  },
  exports: {
    label: "Exportations",
    permissions: {
      "exports:voir": "Voir",
      "exports:creer": "Créer",
      "exports:modifier": "Modifier",
      "exports:supprimer": "Supprimer",
      "exports:valider": "Valider",
      "exports:exporter": "Exporter / Imprimer",
    },
  },
  clients: {
    label: "Clients",
    permissions: {
      "clients:voir": "Voir",
      "clients:creer": "Créer",
      "clients:modifier": "Modifier",
      "clients:supprimer": "Supprimer",
    },
  },
  fournisseurs: {
    label: "Fournisseurs",
    permissions: {
      "fournisseurs:voir": "Voir",
      "fournisseurs:creer": "Créer",
      "fournisseurs:modifier": "Modifier",
      "fournisseurs:supprimer": "Supprimer",
    },
  },
  achats: {
    label: "Achats",
    permissions: {
      "achats:voir": "Voir",
      "achats:creer": "Créer",
      "achats:modifier": "Modifier",
      "achats:supprimer": "Supprimer",
      "achats:valider": "Valider",
    },
  },
  produits: {
    label: "Produits & Stock",
    permissions: {
      "produits:voir": "Voir",
      "produits:creer": "Créer",
      "produits:modifier": "Modifier",
      "produits:supprimer": "Supprimer",
    },
  },
  ngp: {
    label: "NGP / Codes à barres",
    permissions: {
      "ngp:voir": "Voir",
      "ngp:creer": "Créer",
      "ngp:modifier": "Modifier",
      "ngp:supprimer": "Supprimer",
    },
  },
  paiements: {
    label: "Paiements",
    permissions: {
      "paiements:voir": "Voir",
      "paiements:creer": "Créer",
      "paiements:modifier": "Modifier",
      "paiements:supprimer": "Supprimer",
      "paiements:exporter": "Exporter",
    },
  },
  cheques: {
    label: "Chèques",
    permissions: {
      "cheques:voir": "Voir",
      "cheques:creer": "Créer",
      "cheques:modifier": "Modifier",
      "cheques:supprimer": "Supprimer",
      "cheques:encaisser": "Encaisser",
    },
  },
  effets: {
    label: "Effets",
    permissions: {
      "effets:voir": "Voir",
      "effets:creer": "Créer",
      "effets:modifier": "Modifier",
      "effets:supprimer": "Supprimer",
    },
  },
  pos: {
    label: "Point de vente (POS)",
    permissions: {
      "pos:voir": "Voir",
      "pos:creer": "Créer",
      "pos:valider": "Valider",
    },
  },
  rapports: {
    label: "Rapports",
    permissions: {
      "rapports:voir": "Voir",
      "rapports:exporter": "Exporter",
    },
  },
  entreprises: {
    label: "Entreprises",
    permissions: {
      "entreprises:voir": "Voir",
      "entreprises:creer": "Créer",
      "entreprises:modifier": "Modifier",
      "entreprises:supprimer": "Supprimer",
    },
  },
  parametres: {
    label: "Paramètres",
    permissions: {
      "parametres:voir": "Voir",
      "parametres:modifier": "Modifier",
    },
  },
  atelier: {
    label: "Atelier",
    permissions: {
      "modeles:voir": "Voir les modèles",
      "fiches_techniques:voir": "Voir les fiches techniques",
      "commandes:voir": "Voir les commandes",
      "planning:voir": "Voir le planning",
      "production:voir": "Voir la production",
      "production:creer": "Créer un OF",
      "production:modifier": "Modifier un OF",
      "production:supprimer": "Supprimer un OF",
      "packing:voir": "Voir le packing list",
      "packing:creer": "Créer un colisage",
      "packing:modifier": "Modifier un colisage",
      "packing:supprimer": "Supprimer un colisage",
    },
  },
  matieresPremieres: {
    label: "Matières premières",
    permissions: {
      "matieres:voir": "Voir",
      "matieres:creer": "Créer",
      "matieres:modifier": "Modifier",
      "matieres:supprimer": "Supprimer",
    },
  },
} as const;

export type PermissionKey = keyof typeof ALL_PERMISSIONS;
export type PermissionGroup = keyof typeof PERMISSION_GROUPS;

export const ALL_PERMISSIONS = Object.values(PERMISSION_GROUPS).reduce(
  (acc, group) => ({ ...acc, ...group.permissions }),
  {} as Record<string, string>
);

export const ALL_PERMISSION_KEYS = Object.keys(ALL_PERMISSIONS) as PermissionKey[];

export function hasPermission(
  userPermissions: string[] | undefined | null,
  permission: PermissionKey
): boolean {
  if (!userPermissions) return false;
  return userPermissions.includes(permission);
}

export function hasAnyPermission(
  userPermissions: string[] | undefined | null,
  permissions: PermissionKey[]
): boolean {
  if (!userPermissions) return false;
  return permissions.some((p) => userPermissions.includes(p));
}

export function hasAllPermissions(
  userPermissions: string[] | undefined | null,
  permissions: PermissionKey[]
): boolean {
  if (!userPermissions) return false;
  return permissions.every((p) => userPermissions.includes(p));
}

export function userHasPermission(
  role: string,
  userPermissions: string[] | undefined | null,
  permission: PermissionKey
): boolean {
  if (role === "ADMIN") return true;
  return hasPermission(userPermissions, permission);
}

export function requirePermission(
  role: string,
  userPermissions: string[] | undefined | null,
  permission: PermissionKey
): void {
  if (!userHasPermission(role, userPermissions, permission)) {
    throw new Error("Accès refusé : permission manquante");
  }
}

export function checkPermission(
  role: string | undefined,
  userPermissions: string[] | undefined | null,
  permission: PermissionKey
): { allowed: boolean; error?: string; status?: number } {
  if (userHasPermission(role ?? "", userPermissions, permission)) {
    return { allowed: true };
  }
  return { allowed: false, error: "Accès refusé : permission manquante", status: 403 };
}
