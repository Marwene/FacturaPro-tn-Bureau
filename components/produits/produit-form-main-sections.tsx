"use client";

import type { UseFormReturn } from "react-hook-form";
import type { ProductInput } from "@/lib/schemas";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Package, DollarSign, BarChart3, Shirt } from "lucide-react";
import { ProduitFormSection } from "./produit-form-section";
import { ProduitVariantsSection, type VariantFormData } from "./produit-variants-section";

const UNITES = ["Pièce", "Boîte", "Ramette", "Forfait", "Kg", "Litre", "Mètre"];

interface ProduitFormSectionProps {
    form: UseFormReturn<ProductInput>;
}

export function ProduitFormInfosSection({ form, isEdit, codeValue }: ProduitFormSectionProps & {
    isEdit: boolean;
    codeValue: string;
}) {
    return (
        <ProduitFormSection icon={Package} title="Informations générales">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <Label className="text-xs">Code SKU</Label>
                    <Input {...form.register("code")} value={isEdit ? undefined : codeValue} className="h-9 text-sm font-mono bg-muted/50" readOnly={!isEdit} />
                    {!isEdit && <p className="text-[10px] text-muted-foreground">Généré automatiquement depuis le nom du produit</p>}
                </div>
                <div className="space-y-1.5">
                    <Label className="text-xs">Nom *</Label>
                    <Input {...form.register("nom")} className="h-9 text-sm" placeholder="Nom du produit" />
                    {form.formState.errors.nom && <p className="text-[10px] text-red-500">{form.formState.errors.nom.message}</p>}
                </div>
                <div className="col-span-2 space-y-1.5">
                    <Label className="text-xs">Description</Label>
                    <Textarea {...form.register("description")} className="h-24 text-sm resize-none" placeholder="Description du produit..." />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-xs">Unité</Label>
                    <Select value={form.watch("unite")} onValueChange={(v) => form.setValue("unite", v)}>
                        <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {UNITES.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                {form.watch("unite") !== "Pièce" && (
                    <div className="space-y-1.5">
                        <Label className="text-xs">Quantité par unité</Label>
                        <Input
                            {...form.register("quantiteParUnite", { valueAsNumber: true })}
                            type="number"
                            step="0.001"
                            min="0"
                            className="h-9 text-sm"
                            placeholder="Ex: 12 pièces par boîte"
                        />
                        <p className="text-[10px] text-muted-foreground">Nombre de pièces contenues dans cette unité</p>
                    </div>
                )}
                <div className="space-y-1.5">
                    <Label className="text-xs">Actif</Label>
                    <div className="flex items-center gap-2 h-9">
                        <Switch checked={form.watch("actif")} onCheckedChange={(v) => form.setValue("actif", v)} />
                        <span className="text-xs text-muted-foreground">{form.watch("actif") ? "Oui" : "Non"}</span>
                    </div>
                </div>
            </div>
        </ProduitFormSection>
    );
}

export function ProduitFormPricingSection({ form }: ProduitFormSectionProps) {
    return (
        <ProduitFormSection icon={DollarSign} title="Prix & Fiscalité">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <Label className="text-xs">Prix HT (DT) *</Label>
                    <Input {...form.register("prixHT")} type="number" step="0.001" min="0" className="h-9 text-sm" />
                    {form.formState.errors.prixHT && <p className="text-[10px] text-red-500">{form.formState.errors.prixHT.message}</p>}
                </div>
                <div className="space-y-1.5">
                    <Label className="text-xs">Taux TVA (%)</Label>
                    <Select value={String(form.watch("tauxTVA"))} onValueChange={(v) => form.setValue("tauxTVA", parseFloat(v))}>
                        <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {["0", "7", "13", "19"].map((v) => <SelectItem key={v} value={v}>{v}%</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex items-center gap-3">
                    <Switch checked={form.watch("fodec")} onCheckedChange={(v) => form.setValue("fodec", v)} />
                    <Label className="text-xs">Soumis au FODEC (1%)</Label>
                </div>
                {form.watch("fodec") && (
                    <div className="space-y-1.5">
                        <Label className="text-xs">Taux FODEC (%)</Label>
                        <Input {...form.register("tauxFodec")} type="number" step="0.1" min="0" max="100" className="h-9 text-sm" />
                    </div>
                )}
            </div>
        </ProduitFormSection>
    );
}

export function ProduitFormStockSection({ form }: ProduitFormSectionProps) {
    return (
        <ProduitFormSection icon={BarChart3} title="Stock">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <Label className="text-xs">Stock actuel</Label>
                    <Input {...form.register("stockActuel")} type="number" step="1" min="0" className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-xs">Stock minimum (alerte)</Label>
                    <Input {...form.register("stockMinimum")} type="number" step="1" min="0" className="h-9 text-sm" />
                </div>
                <div className="col-span-2 flex items-center gap-3">
                    <Switch checked={form.watch("estSurCommande")} onCheckedChange={(v) => form.setValue("estSurCommande", v)} />
                    <div>
                        <Label className="text-xs">Produit sur commande</Label>
                        <p className="text-[10px] text-muted-foreground">Le stock ne descend jamais sous 1 pièce (échantillon permanent)</p>
                    </div>
                </div>
            </div>
        </ProduitFormSection>
    );
}

export function ProduitFormVariantsSection({
    variants,
    onChange,
}: {
    variants: VariantFormData[];
    onChange: (variants: VariantFormData[]) => void;
}) {
    return (
        <ProduitFormSection
            icon={Shirt}
            title="Déclinaisons"
            description="Variantes du produit (couleur, taille, etc.)"
        >
            <ProduitVariantsSection variants={variants} onChange={onChange} />
        </ProduitFormSection>
    );
}
