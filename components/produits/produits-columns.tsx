"use client";

import Link from "next/link";
import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Edit, Eye, MoreHorizontal, Package, QrCode, Trash2 } from "lucide-react";
import type { SerializedProduct, StockStatus } from "@/lib/types";
import { FEATURE_FLAGS } from "@/lib/feature-flags";
import { formatTND } from "@/lib/decimal";
import { Button } from "@/components/ui/button";
import { StockStatusBadge } from "@/components/status-badge";
import { ProductQRCode } from "./product-qr-code";
import { generateProductQRData } from "@/lib/qr-data";
import { stockFillClass, stockFillPercent } from "./produits-list-logic";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Colonnes de la table Produits — extraites de `produits-client.tsx`
 * (lot I, découpage des gros composants, limite 250 lignes).
 */
export function getProduitsColumns(onDelete: (product: SerializedProduct) => void): ColumnDef<SerializedProduct>[] {
    return [
        {
            accessorKey: "code",
            header: "Code",
            cell: (info) => (
                <span className="text-sm font-mono font-medium">{info.renderValue() as string}</span>
            ),
        },
        {
            id: "produit",
            accessorKey: "nom",
            header: "Produit",
            cell: (info) => {
                const row = info.row.original;
                return (
                    <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted shrink-0">
                            <Package className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                                <p className="text-sm font-medium truncate">{row.nom}</p>
                                {row.estSurCommande && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                                        <span className="inline-block h-1 w-1 rounded-full bg-amber-500" />
                                        Sur commande
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate max-w-[260px]">{row.description ?? ""}</p>
                        </div>
                    </div>
                );
            },
        },
        {
            accessorKey: "categorieName",
            header: "Catégorie",
            cell: (info) => <span className="text-sm">{String(info.renderValue() ?? "—")}</span>,
        },
        {
            id: "suppliers",
            header: "Fournisseurs",
            cell: (info) => {
                if (!FEATURE_FLAGS.SHOW_SUPPLIERS_LISTING) return null;
                const suppliers = info.row.original.suppliers ?? [];
                if (suppliers.length === 0) return <span className="text-xs text-muted-foreground">—</span>;
                return (
                    <div className="flex flex-col gap-0.5">
                        {suppliers.map((s) => (
                            <div key={s.productSupplierId} className="flex items-center gap-1 text-xs">
                                {s.isDefault && <span className="size-1.5 rounded-full bg-amber-500 shrink-0" />}
                                <span className="truncate">{s.supplierName}</span>
                            </div>
                        ))}
                    </div>
                );
            },
        },
        {
            id: "purchasePrices",
            header: "Prix Achat",
            cell: (info) => {
                if (!FEATURE_FLAGS.SHOW_SUPPLIERS_LISTING) return null;
                const suppliers = info.row.original.suppliers ?? [];
                if (suppliers.length === 0) return <span className="text-xs text-muted-foreground">—</span>;
                return (
                    <div className="flex flex-col gap-0.5">
                        {suppliers.map((s) => (
                            <div key={s.productSupplierId} className="flex items-center gap-1 text-xs tabular-nums">
                                {s.isDefault && <span className="size-1.5 rounded-full bg-amber-500 shrink-0" />}
                                <span>{formatTND(s.purchasePrice)}</span>
                            </div>
                        ))}
                    </div>
                );
            },
        },
        {
            id: "salePrices",
            header: "Prix Vente",
            cell: (info) => {
                const row = info.row.original;
                return (
                    <span className="text-sm font-medium tabular-nums">{formatTND(row.prixHT)}</span>
                );
            },
        },
        {
            accessorKey: "tauxTVA",
            header: "TVA",
            cell: (info) => <span className="text-sm">{String(info.renderValue())}%</span>,
        },
        {
            accessorKey: "fodec",
            header: "FODEC",
            cell: (info) => {
                const row = info.row.original;
                return info.renderValue() ? (
                    <span className="text-xs">{row.tauxFodec}%</span>
                ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                );
            },
        },
        {
            id: "stock",
            header: "Stock",
            cell: (info) => {
                const row = info.row.original;
                return (
                    <div className="flex items-center gap-2">
                        <div className="flex-1 min-w-[60px]">
                            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all ${stockFillClass(row.stockStatus)}`}
                                    style={{ width: `${stockFillPercent(row.stockActuel, row.stockMinimum)}%` }}
                                />
                            </div>
                        </div>
                        <span className="text-sm text-right whitespace-nowrap">
                            {row.stockActuel} {row.unite}
                        </span>
                    </div>
                );
            },
        },
        {
            accessorKey: "stockStatus",
            header: "Statut Stock",
            cell: (info) => <StockStatusBadge status={info.renderValue() as StockStatus} />,
        },
        {
            id: "qr",
            header: "",
            cell: ({ row }) => <ProductQrCell product={row.original} />,
        },
        {
            id: "actions",
            cell: ({ row }) => (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem className="gap-2 text-sm" asChild>
                            <Link href={`/produits/${row.original.id}`}>
                                <Eye className="h-4 w-4" /> Voir le détail
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2 text-sm" asChild>
                            <Link href={`/produits/${row.original.id}`}>
                                <Edit className="h-4 w-4" /> Modifier
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className="gap-2 text-sm text-destructive focus:text-destructive"
                            onClick={() => onDelete(row.original)}
                        >
                            <Trash2 className="h-4 w-4" /> Supprimer
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            ),
        },
    ];
}

function ProductQrCell({ product }: { product: SerializedProduct }) {
    const [open, setOpen] = useState(false);
    const qrData = generateProductQRData({
        id: product.id,
        code: product.code,
        nom: product.nom,
        description: product.description,
        categorie: product.categorieName,
        prixHT: product.prixHT,
        tauxTVA: product.tauxTVA,
        stockActuel: product.stockActuel,
        unite: product.unite,
    });
    return (
        <>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setOpen(true); }}>
                <QrCode className="h-4 w-4" />
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>{product.code} · {product.nom}</DialogTitle>
                        <DialogDescription>
                            Scannez pour afficher la fiche produit
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-center py-4">
                        <ProductQRCode codeBarre={qrData} nom={product.nom} code={product.code} large />
                    </div>
                    <div className="text-center text-xs text-muted-foreground">
                        Ouvrez votre caméra, et scanner le QR code pour obtenir télécharger la fiche technique, et les informations du produits.
                    </div>
                    <DialogFooter className="sm:justify-center">
                        <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
                            Fermer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
