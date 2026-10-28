"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import type { SerializedProduct } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ChartErrorBoundary } from "@/components/shared/chart-error-boundary";
import { formatTND } from "@/lib/decimal";
import { cn } from "@/lib/utils";
import {
    Package, TrendingUp, ShoppingCart, Shirt,
    BarChart3, QrCode, FileText, Building2, Percent,
} from "lucide-react";
import Image from "next/image";
import { ProductQRCode } from "./product-qr-code";
import { ProductPerformanceChart } from "./product-performance-chart";
import { ProductStockChart } from "./product-stock-chart";
import { ProductFichesList } from "./product-fiches-list";
import { ProductSuppliersSection } from "./product-suppliers-section";
import { ProduitStockMovements } from "./product-stock-movements";
import { AjusterStockDialog } from "./adjust-stock-dialog";
import { ProduitVariantsList } from "./produit-variants-list";
import { prixAchatAffiche, stockNiveaux, valeurStockAffiche } from "./produit-detail-logic";

interface DetailSectionProps {
    heading?: "h2" | "h3";
    icon: LucideIcon;
    title: string;
    description: string;
    action?: ReactNode;
    contentClassName?: string;
    children: ReactNode;
}

/**
 * Carte de section de la fiche produit — structure identique à l'original :
 * `rounded-2xl border` + en-tête (icône + titre + description) + corps `px-5 pb-5`.
 * `action` place un slot à droite de l'en-tête (variante `flex items-start justify-between`).
 */
function DetailSection({
    heading: Heading = "h2",
    icon: Icon,
    title,
    description,
    action,
    contentClassName,
    children,
}: DetailSectionProps) {
    const headingBlock = (
        <>
            <Heading className="text-sm font-semibold flex items-center gap-2">
                <Icon className="size-4 text-muted-foreground" />
                {title}
            </Heading>
            <p className="text-[10px] text-muted-foreground mt-0.5">{description}</p>
        </>
    );
    return (
        <div className="rounded-2xl border">
            <div className={cn("p-5 pb-3", action && "flex items-start justify-between")}>
                {action ? <div>{headingBlock}</div> : headingBlock}
                {action}
            </div>
            <div className={cn("px-5 pb-5", contentClassName)}>{children}</div>
        </div>
    );
}

function QuickInfo({ label, value, highlight }: { label: string; value?: string | null; highlight?: boolean }) {
    return (
        <div className={cn(
            "px-3 py-2.5 rounded-xl border",
            highlight && "border-emerald-200 dark:border-emerald-900 bg-emerald-50/60 dark:bg-emerald-950/20"
        )}>
            <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
            <p className={cn(
                "text-sm truncate",
                highlight && "font-bold text-emerald-700 dark:text-emerald-400"
            )}>{value ?? "—"}</p>
        </div>
    );
}

function ProduitInfosSection({ product: p }: { product: SerializedProduct }) {
    return (
        <DetailSection icon={Package} title="Informations générales" description="Fiche d'identité du produit">
            <div className="flex gap-8">
                {p.photoUrl ? (
                    <div className="shrink-0">
                        <div className="w-64 h-64 rounded-2xl overflow-hidden border-dashed bg-muted border-muted-foreground/25">
                            <Image src={p.photoUrl} alt={p.nom} width={256} height={256} unoptimized className="w-full h-full object-cover" loading="eager" />
                        </div>
                    </div>
                ) : (
                    <div className="shrink-0 w-64 h-64 rounded-2xl border-2 border-dashed flex items-center justify-center bg-muted/30">
                        <Package className="size-10 text-muted-foreground/50" />
                    </div>
                )}
                <div className="flex-1 min-w-0 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <QuickInfo label="Catégorie" value={p.categorieName} />
                        <QuickInfo label="Marque" value={p.marqueName} />
                        <QuickInfo label="Fournisseur" value={p.tiersName} />
                        <QuickInfo label="Unité" value={p.unite} />
                        {p.quantiteParUnite && (
                            <QuickInfo label="Qté / unité" value={`${p.quantiteParUnite} pcs`} />
                        )}
                        <QuickInfo label="Prix HT" value={formatTND(p.prixHT)} highlight />
                        <QuickInfo label="Prix achat" value={prixAchatAffiche(p)} />
                    </div>
                    {p.description && (
                        <p className="text-sm text-muted-foreground leading-relaxed">{p.description}</p>
                    )}
                </div>
            </div>
        </DetailSection>
    );
}

function ProduitPerformanceSection({ productId }: { productId: string }) {
    return (
        <DetailSection icon={TrendingUp} title="Performance commerciale" description="Évolution des ventes et des revenus dans le temps">
            <ChartErrorBoundary>
                <ProductPerformanceChart productId={productId} />
            </ChartErrorBoundary>
        </DetailSection>
    );
}

function ProduitMouvementsSection({ productId }: { productId: string }) {
    return (
        <DetailSection icon={ShoppingCart} title="Mouvements de stock" description="Entrées et sorties de stock enregistrées" action={<AjusterStockDialog productId={productId} />}>
            <ProduitStockMovements productId={productId} />
        </DetailSection>
    );
}

function ProduitDeclinaisonsSection({ productId }: { productId: string }) {
    return (
        <DetailSection icon={Shirt} title="Déclinaisons" description="Variantes du produit (couleur, taille, etc.)">
            <ProduitVariantsList productId={productId} />
        </DetailSection>
    );
}

function ProduitStockSection({ product: p }: { product: SerializedProduct }) {
    const stock = stockNiveaux(p);
    return (
        <DetailSection heading="h3" icon={BarChart3} title="État du stock" description="Niveau actuel et seuil d'alerte">
            <ChartErrorBoundary>
                <ProductStockChart
                    stockActuel={stock.stockActuel}
                    stockMinimum={stock.stockMinimum}
                    unite={p.unite}
                    stockStatus={p.stockStatus}
                />
            </ChartErrorBoundary>
        </DetailSection>
    );
}

function ProduitQrSection({ product: p }: { product: SerializedProduct }) {
    return (
        <DetailSection heading="h3" icon={QrCode} title="QR Code" description="Fiche produit accessible sur mobile" contentClassName="flex flex-col items-center gap-2">
            <ProductQRCode codeBarre={p.codeBarre} nom={p.nom} code={p.code} large showMessage />
        </DetailSection>
    );
}

function ProduitFichesSection({ productId }: { productId: string }) {
    return (
        <DetailSection heading="h3" icon={FileText} title="Fiches techniques" description="Documents PDF associés au produit">
            <ProductFichesList productId={productId} />
        </DetailSection>
    );
}

function ProduitFournisseursSection({ productId }: { productId: string }) {
    return (
        <DetailSection heading="h3" icon={Building2} title="Fournisseurs" description="Fournisseurs et prix d'achat">
            <ProductSuppliersSection productId={productId} />
        </DetailSection>
    );
}

function ProduitFiscaliteSection({ product: p }: { product: SerializedProduct }) {
    return (
        <DetailSection heading="h3" icon={Percent} title="Fiscalité" description="TVA, FODEC et valorisation du stock">
            <div className="space-y-3">
                <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">TVA</span>
                    <span className="text-sm font-semibold">{p.tauxTVA}%</span>
                </div>
                <div className="border-t" />
                <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">FODEC</span>
                    <Badge variant={p.fodec ? "default" : "outline"} className="text-[10px]">
                        {p.fodec ? `${p.tauxFodec}%` : "Non soumis"}
                    </Badge>
                </div>
                <div className="border-t" />
                <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Valeur stock</span>
                    <span className="text-sm font-semibold">{valeurStockAffiche(p)}</span>
                </div>
            </div>
        </DetailSection>
    );
}

export function ProduitDetailMainColumn({ product, productId }: { product: SerializedProduct; productId: string }) {
    return (
        <div className="lg:col-span-2 space-y-8">
            <ProduitInfosSection product={product} />
            <Separator />
            <ProduitPerformanceSection productId={productId} />
            <Separator />
            <ProduitMouvementsSection productId={productId} />
            <Separator />
            <ProduitDeclinaisonsSection productId={productId} />
        </div>
    );
}

export function ProduitDetailSidebar({ product, productId }: { product: SerializedProduct; productId: string }) {
    return (
        <div className="space-y-6">
            <ProduitStockSection product={product} />
            <ProduitQrSection product={product} />
            <ProduitFichesSection productId={productId} />
            <ProduitFournisseursSection productId={productId} />
            <ProduitFiscaliteSection product={product} />
        </div>
    );
}
