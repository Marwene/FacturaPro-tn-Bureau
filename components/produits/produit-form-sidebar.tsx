"use client";

import type { ReactNode } from "react";
import type { UseFormReturn } from "react-hook-form";
import type { ProductInput } from "@/lib/schemas";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Building2, Package, QrCode, Tag, type LucideIcon } from "lucide-react";
import { CategoryTreeSelect } from "./category-tree-select";
import { MarqueSelect } from "./marque-select";
import { ProductQRCode } from "./product-qr-code";
import type { FournisseurListItem } from "@/hooks/use-produit-form-suppliers";

interface SideCardProps {
    icon: LucideIcon;
    title: string;
    description: string;
    contentClassName?: string;
    children: ReactNode;
}

function SideCard({ icon: Icon, title, description, contentClassName = "px-5 pb-5", children }: SideCardProps) {
    return (
        <div className="rounded-2xl border">
            <div className="p-5 pb-3">
                <h3 className="text-xs font-semibold flex items-center gap-2">
                    <Icon className="size-3.5 text-muted-foreground" />
                    {title}
                </h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">{description}</p>
            </div>
            <div className={contentClassName}>{children}</div>
        </div>
    );
}

interface ProduitFormSidebarProps {
    form: UseFormReturn<ProductInput>;
    fournisseurs: Record<string, unknown>[];
    qrPreviewData: string;
    qrNom: string;
    qrCode: string;
}

export function ProduitFormSidebar({ form, fournisseurs, qrPreviewData, qrNom, qrCode }: ProduitFormSidebarProps) {
    return (
        <div className="space-y-6">
            <SideCard icon={Package} title="Catégorie" description="Classement du produit dans l'arborescence">
                <CategoryTreeSelect
                    value={form.watch("categorieId")}
                    onValueChange={(v) => form.setValue("categorieId", v)}
                />
            </SideCard>

            <SideCard icon={Tag} title="Marque" description="Marque ou fabricant du produit">
                <MarqueSelect
                    value={form.watch("marqueId")}
                    onValueChange={(v) => form.setValue("marqueId", v)}
                />
            </SideCard>

            <SideCard icon={Building2} title="Fournisseur attitré" description="Fournisseur principal du produit">
                <Select
                    value={form.watch("tiersId") ?? "__null__"}
                    onValueChange={(v) => form.setValue("tiersId", v === "__null__" ? null : v)}
                >
                    <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Aucun" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="__null__">Aucun</SelectItem>
                        {fournisseurs
                            .filter(
                                (f): f is FournisseurListItem =>
                                    typeof f.id === "string" && typeof f.raisonSociale === "string"
                            )
                            .map((f) => (
                                <SelectItem key={f.id} value={f.id}>{f.raisonSociale}</SelectItem>
                            ))}
                    </SelectContent>
                </Select>
            </SideCard>

            <SideCard
                icon={QrCode}
                title="QR Code"
                description="Afficher la fiche produit sur mobile"
                contentClassName="px-5 pb-5 flex flex-col items-center"
            >
                <div className="bg-white rounded-xl p-2 flex justify-center">
                    <ProductQRCode codeBarre={qrPreviewData} nom={qrNom} code={qrCode} compact />
                </div>
                <p className="text-[10px] text-muted-foreground text-center mt-2">Généré à l&apos;enregistrement</p>
            </SideCard>
        </div>
    );
}
