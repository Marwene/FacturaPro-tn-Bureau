import type { StockStatus } from "./enums";

import type { SerializedProductVariant } from "./variant";

export interface ProductSupplierOption {
    productSupplierId: string;
    supplierId: string;
    supplierName: string;
    purchasePrice: string;
    salePrice: number | null;
    reference: string | null;
    isDefault: boolean;
}

export interface ProductRef {
    id: string;
    code: string;
    nom: string;
}

export interface SerializedProduct {
    id: string;
    code: string;
    nom: string;
    description: string | null;
    categorieId: string | null;
    categorieName: string | null;
    marqueId: string | null;
    marqueName: string | null;
    tiersId: string | null;
    tiersName: string | null;
    photoUrl: string | null;
    ficheTechniqueUrl: string | null;
    codeBarre: string | null;
    prixHT: string;
    prixAchat: string;
    prixAchatDefault: number | null;
    tauxTVA: string;
    fodec: boolean;
    tauxFodec: string;
    stockActuel: string;
    stockMinimum: string;
    unite: string;
    estSurCommande: boolean;
    quantiteParUnite: string | null;
    stockStatus: StockStatus;
    actif: boolean;
    createdAt: Date;
    updatedAt: Date;
    variants?: SerializedProductVariant[];
    suppliers?: ProductSupplierOption[];
}
