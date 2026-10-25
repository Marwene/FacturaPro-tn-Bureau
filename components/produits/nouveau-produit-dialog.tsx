"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { productSchema } from "@/lib/schemas";
import { z } from "zod";
import { useProduitsMutations } from "@/hooks/use-produits";
import { useProduitsStore } from "@/lib/stores/produits-store";
import { notify } from "@/lib/notify";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Plus } from "lucide-react";
import { CategoryTreeSelect } from "./category-tree-select";

const UNITES = ["Pièce", "Boîte", "Ramette", "Forfait", "Kg", "Litre", "Mètre"];

export function NouveauProduitDialog() {
    const { nouveauOpen, setNouveauOpen } = useProduitsStore();
    const { createProduct } = useProduitsMutations();

    const form = useForm<z.input<typeof productSchema>>({
        resolver: zodResolver(productSchema),
        defaultValues: {
            code: "",
            nom: "",
            description: "",
            categorieId: null,
            prixHT: "0",
            tauxTVA: 19,
            fodec: false,
            tauxFodec: 1,
            stockActuel: 0,
            stockMinimum: 0,
            unite: "Pièce",
            estSurCommande: false,
            quantiteParUnite: null,
            actif: true,
        },
    });

    const onSubmit = (data: z.input<typeof productSchema>) => {
        createProduct.mutate(data, {
            onSuccess: () => {
                notify.success({
                    title: "Produit créé",
                    description: "Il apparaît dans la liste des produits.",
                });
                form.reset();
                setNouveauOpen(false);
            },
            onError: (err: unknown) =>
                notify.error({
                    title: "Création du produit impossible",
                    error: err,
                    context: "lors de la création du produit",
                }),
        });
    };

    return (
        <>
            <Button size="sm" className="gap-1.5 text-xs" onClick={() => setNouveauOpen(true)}>
                <Plus className="h-3.5 w-3.5" />
                Nouveau Produit
            </Button>

            <Dialog open={nouveauOpen} onOpenChange={setNouveauOpen}>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-sm font-semibold">
                            Nouveau Produit
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-xs">Code *</Label>
                                <Input
                                    {...form.register("code")}
                                    className="h-8 text-sm font-mono"
                                    placeholder="PC-001"
                                />
                                {form.formState.errors.code && (
                                    <p className="text-xs text-red-500">
                                        {form.formState.errors.code.message}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Nom *</Label>
                                <Input
                                    {...form.register("nom")}
                                    className="h-8 text-sm"
                                />
                                {form.formState.errors.nom && (
                                    <p className="text-xs text-red-500">
                                        {form.formState.errors.nom.message}
                                    </p>
                                )}
                            </div>
                            <div className="col-span-2 space-y-1">
                                <Label className="text-xs">Description</Label>
                                <Input
                                    {...form.register("description")}
                                    className="h-8 text-sm"
                                    placeholder="Marque, modèle, spécifications..."
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Catégorie</Label>
                                <CategoryTreeSelect
                                    value={form.watch("categorieId")}
                                    onValueChange={(v) => form.setValue("categorieId", v)}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Unité</Label>
                                <Select
                                    value={form.watch("unite")}
                                    onValueChange={(v) => form.setValue("unite", v)}
                                >
                                    <SelectTrigger className="h-8 text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {UNITES.map((u) => (
                                            <SelectItem key={u} value={u}>
                                                {u}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            {form.watch("unite") !== "Pièce" && (
                                <div className="space-y-1">
                                    <Label className="text-xs">Quantité par unité</Label>
                                    <Input
                                        {...form.register("quantiteParUnite", { valueAsNumber: true })}
                                        type="number"
                                        step="0.001"
                                        min="0"
                                        className="h-8 text-sm"
                                        placeholder="Ex: 12 pièces par boîte"
                                    />
                                    <p className="text-[10px] text-muted-foreground">Nombre de pièces contenues dans cette unité</p>
                                </div>
                            )}
                        </div>

                        <Separator />

                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Prix & Fiscalité
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-xs">Prix HT (DT) *</Label>
                                <Input
                                    {...form.register("prixHT")}
                                    type="number"
                                    step="0.001"
                                    min="0"
                                    className="h-8 text-sm"
                                />
                                {form.formState.errors.prixHT && (
                                    <p className="text-xs text-red-500">
                                        {form.formState.errors.prixHT.message}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Taux TVA (%)</Label>
                                <Select
                                    value={String(form.watch("tauxTVA"))}
                                    onValueChange={(v) => form.setValue("tauxTVA", parseFloat(v))}
                                >
                                    <SelectTrigger className="h-8 text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="0">0%</SelectItem>
                                        <SelectItem value="7">7%</SelectItem>
                                        <SelectItem value="13">13%</SelectItem>
                                        <SelectItem value="19">19%</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Switch
                                checked={form.watch("fodec")}
                                onCheckedChange={(v) => form.setValue("fodec", v)}
                            />
                            <Label className="text-xs">Soumis au FODEC (1%)</Label>
                        </div>

                        <Separator />

                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Stock
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-xs">Stock Actuel</Label>
                                <Input
                                    {...form.register("stockActuel")}
                                    type="number"
                                    step="1"
                                    min="0"
                                    className="h-8 text-sm"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Stock Minimum (alerte)</Label>
                                <Input
                                    {...form.register("stockMinimum")}
                                    type="number"
                                    step="1"
                                    min="0"
                                    className="h-8 text-sm"
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Switch checked={form.watch("estSurCommande")} onCheckedChange={(v) => form.setValue("estSurCommande", v)} />
                            <div>
                                <Label className="text-xs">Produit sur commande</Label>
                                <p className="text-[10px] text-muted-foreground">Le stock ne descend jamais sous 1 pièce (échantillon permanent)</p>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setNouveauOpen(false)}
                            >
                                Annuler
                            </Button>
                            <Button
                                type="submit"
                                size="sm"
                                disabled={createProduct.isPending}
                            >
                                {createProduct.isPending ? "Création..." : "Créer le Produit"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}