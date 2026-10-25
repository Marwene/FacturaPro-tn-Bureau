"use client";

import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { productSchema, type ProductInput } from "@/lib/schemas";
import { useProduitsMutations, useProduitNextCode, useProduitFichiersMutations } from "@/hooks/use-produits";
import { useSyncProductVariants } from "@/hooks/use-product-variants";
import { notify } from "@/lib/notify";
import { Button } from "@/components/ui/button";
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
import { CategoryTreeSelect } from "./category-tree-select";
import { MarqueSelect } from "./marque-select";
import { ProductQRCode } from "./product-qr-code";
import { ProduitVariantsSection } from "./produit-variants-section";
import { useFournisseurs } from "@/hooks/use-fournisseurs-queries";
import {
    ArrowLeft, Save, Package, DollarSign, BarChart3,
    QrCode, Building2, Tag, ImagePlus, FileText, X, Loader2,
    Upload, Shirt, Plus, Trash2, CircleCheck,
} from "lucide-react";
import type { ProductSupplierInput } from "@/lib/schemas";
import type { SerializedProduct, SerializedProductVariant } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useDeferredValue, type FormEvent } from "react";
import { generateProductQRData } from "@/lib/qr-data";
import Image from "next/image";

const UNITES = ["Pièce", "Boîte", "Ramette", "Forfait", "Kg", "Litre", "Mètre"];

type FournisseurListItem = { id: string; raisonSociale: string };

type ProduitFormProduct = Omit<
    SerializedProduct,
    "categorieName" | "marqueName" | "tiersName" | "prixAchatDefault" | "createdAt" | "updatedAt" | "variants"
> & {
    variants?: Omit<SerializedProductVariant, "createdAt" | "updatedAt">[];
};

type VariantFormState = {
    id?: string;
    nom: string;
    code: string;
    attributs: Record<string, string>;
    prixHT: string;
    stockActuel: string;
    stockMinimum: string;
    photoUrl: string;
    actif: boolean;
    ordre: number;
};

export function ProduitFormPage({ product }: { product?: ProduitFormProduct }) {
    const router = useRouter();
    const { createProduct, updateProduct } = useProduitsMutations();
    const { data: fournisseursData } = useFournisseurs();
    const isEdit = !!product;
    const [saving, setSaving] = useState(false);

    // ── File state ──
    const [pendingPhoto, setPendingPhoto] = useState<File | null>(null);
    const [pendingPhotoPreview, setPendingPhotoPreview] = useState<string | null>(null);
    const [pendingFiches, setPendingFiches] = useState<File[]>([]);
    const [existingPhoto, setExistingPhoto] = useState<string | null>(product?.photoUrl ?? null);

    const photoInputRef = useRef<HTMLInputElement>(null);
    const ficheInputRef = useRef<HTMLInputElement>(null);

    const form = useForm<ProductInput>({
        resolver: zodResolver(productSchema) as Resolver<ProductInput>,
        defaultValues: {
            code: product?.code ?? "",
            nom: product?.nom ?? "",
            description: product?.description ?? "",
            categorieId: product?.categorieId ?? null,
            marqueId: product?.marqueId ?? null,
            tiersId: product?.tiersId ?? null,
            photoUrl: product?.photoUrl ?? null,
            ficheTechniqueUrl: product?.ficheTechniqueUrl ?? null,
            prixHT: product?.prixHT ?? "0",
            tauxTVA: product ? parseFloat(product.tauxTVA) : 19,
            fodec: product?.fodec ?? false,
            tauxFodec: product ? parseFloat(product.tauxFodec) : 1,
            stockActuel: product ? parseFloat(product.stockActuel) : 0,
            stockMinimum: product ? parseFloat(product.stockMinimum) : 0,
            unite: product?.unite ?? "Pièce",
            estSurCommande: product?.estSurCommande ?? false,
            quantiteParUnite: product?.quantiteParUnite ? parseFloat(product.quantiteParUnite) : null,
            actif: product?.actif ?? true,
        },
    });

    // ── Variants ──
    const [variants, setVariants] = useState<VariantFormState[]>(() => {
        if (isEdit && product?.variants) {
            return product.variants.map((v) => ({
                id: v.id,
                nom: v.nom,
                code: v.code ?? "",
                attributs: v.attributs ?? {},
                prixHT: v.prixHT ?? "",
                stockActuel: v.stockActuel ?? "0",
                stockMinimum: v.stockMinimum ?? "0",
                photoUrl: v.photoUrl ?? "",
                actif: v.actif ?? true,
                ordre: v.ordre ?? 0,
            }));
        }
        return [];
    });
    const syncVariants = useSyncProductVariants();
    const { uploadPhoto, uploadFiche, deletePhoto } = useProduitFichiersMutations();

    // ── Suppliers ──
    const [formSuppliers, setFormSuppliers] = useState<ProductSupplierInput[]>(() => {
        if (isEdit && product?.suppliers) {
            return product.suppliers.map((s) => ({
                supplierId: s.supplierId,
                purchasePrice: parseFloat(s.purchasePrice),
                reference: s.reference ?? null,
                isDefault: s.isDefault,
            }));
        }
        return [];
    });
    const [newSupplierId, setNewSupplierId] = useState<string>("");
    const [newSupplierPrice, setNewSupplierPrice] = useState<string>("");
    const [newSupplierRef, setNewSupplierRef] = useState<string>("");

    // ── Auto SKU ──
    const watchedNom = form.watch("nom");
    const deferredNom = useDeferredValue(watchedNom);
    const { data: nextCode } = useProduitNextCode(deferredNom, !isEdit && !!deferredNom);

    const watched = form.watch();

    // Affichage dérivé du SKU (ex-useEffect qui copiait `nextCode.code` dans le
    // champ RHF) : le champ est readOnly en création, la valeur affichée vient
    // de la query, `watched.code` sert de repli (isEdit ou réponse absente).
    // La valeur n'est réinjectée dans RHF qu'au submit (handleFormSubmit) —
    // l'autre route (setValue au rendu) réécrirait les champs édités via reset().
    const codeValue = !isEdit && nextCode?.code ? nextCode.code : watched.code;

    const qrPreviewData = useMemo(() => generateProductQRData({
        id: product?.id ?? "new",
        code: codeValue || "CODE",
        nom: watched.nom || "Nom produit",
        description: watched.description,
        categorie: "",
        prixHT: watched.prixHT || 0,
        tauxTVA: watched.tauxTVA || 0,
        stockActuel: watched.stockActuel || 0,
        unite: watched.unite || "Pièce",
    }), [codeValue, watched.nom, watched.description, watched.prixHT, watched.tauxTVA, watched.stockActuel, watched.unite, product?.id]);

    const onSubmit = async (data: ProductInput) => {
        setSaving(true);

        // Vérifier que le prix de vente n'est pas égal à un prix d'achat
        const prixAchatMatch = formSuppliers.some(
            (s) => parseFloat(String(data.prixHT)) === s.purchasePrice
        );
        if (formSuppliers.length > 0 && prixAchatMatch) {
            notify.warning({
                title: "Prix de vente identique au prix d'achat",
                description: "Modifiez le prix de vente : il doit être différent du prix d'achat fournisseur.",
            });
            setSaving(false);
            return;
        }

        try {
            if (isEdit && product) {
                // Edit mode: update product first, then sync variants + upload pending files
                await updateProduct.mutateAsync({ id: product.id, data: { ...data, suppliers: formSuppliers } });
                if (variants.length > 0) await syncVariants.mutateAsync({ productId: product.id, variants });
                if (pendingPhoto) await uploadPhoto.mutateAsync({ productId: product.id, file: pendingPhoto });
                for (const f of pendingFiches) await uploadFiche.mutateAsync({ productId: product.id, file: f });
                notify.success({ title: `Produit « ${data.nom} » modifié` });
                router.push(`/produits/${product.id}`);
            } else {
                // Create mode: save product, then sync variants + upload files
                const res = await createProduct.mutateAsync({ ...data, suppliers: formSuppliers });
                const newId = res.product.id;
                if (variants.length > 0) {
                    await syncVariants.mutateAsync({ productId: newId, variants });
                }
                if (pendingPhoto) await uploadPhoto.mutateAsync({ productId: newId, file: pendingPhoto });
                for (const f of pendingFiches) await uploadFiche.mutateAsync({ productId: newId, file: f });
                notify.success({ title: `Produit « ${data.nom} » créé` });
                router.push(`/produits/${newId}`);
            }
        } catch (err) {
            notify.error({
                title: isEdit ? "Enregistrement du produit impossible" : "Création du produit impossible",
                error: err,
                context: isEdit
                    ? "lors de la modification du produit, de ses variantes et de ses fichiers"
                    : "lors de la création du produit, de ses variantes et de ses fichiers",
            });
        } finally {
            setSaving(false);
        }
    };

    // ── Photo handlers ──
    const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (isEdit && product) {
            // Upload directly
            uploadPhoto.mutateAsync({ productId: product.id, file }).then(() => {
                setExistingPhoto(`/uploads/products/${product.id}/photo-${Date.now()}.${file.type.split("/")[1]}`);
                notify.success({ title: "Photo du produit ajoutée" });
            }).catch((err: unknown) =>
                notify.error({
                    title: "Ajout de la photo impossible",
                    error: err,
                    context: "lors de l'ajout de la photo du produit",
                })
            );
        } else {
            // Queue for creation
            setPendingPhoto(file);
            setPendingPhotoPreview(URL.createObjectURL(file));
        }
        if (photoInputRef.current) photoInputRef.current.value = "";
    };

    const handlePhotoRemove = async () => {
        if (isEdit && product) {
            try {
                await deletePhoto.mutateAsync(product.id);
                setExistingPhoto(null);
            } catch (error) {
                notify.error({
                    title: "Suppression de la photo impossible",
                    error,
                    context: "lors de la suppression de la photo du produit",
                });
            }
        } else {
            setPendingPhoto(null);
            setPendingPhotoPreview(null);
        }
    };

    const handleFicheSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? []);
        if (isEdit && product) {
            Promise.all(files.map((f) => uploadFiche.mutateAsync({ productId: product.id, file: f })))
                .then(() =>
                    notify.success({
                        title: files.length === 1 ? "Fiche technique ajoutée" : `${files.length} fiches techniques ajoutées`,
                    })
                )
                .catch((err: unknown) =>
                    notify.error({
                        title: "Ajout des fiches techniques impossible",
                        error: err,
                        context: "lors de l'ajout des fiches techniques du produit",
                    })
                );
        } else {
            setPendingFiches((prev) => [...prev, ...files]);
        }
        if (ficheInputRef.current) ficheInputRef.current.value = "";
    };

    // ── Supplier handlers ──
    const handleAddSupplier = () => {
        if (!newSupplierId || !newSupplierPrice) return;
        const alreadyExists = formSuppliers.some((s) => s.supplierId === newSupplierId);
        if (alreadyExists) {
            notify.warning({
                title: "Fournisseur déjà associé",
                description: "Ce fournisseur figure déjà dans la liste des fournisseurs du produit.",
            });
            return;
        }
        const hasDefault = formSuppliers.some((s) => s.isDefault);
        setFormSuppliers([
            ...formSuppliers,
            {
                supplierId: newSupplierId,
                purchasePrice: parseFloat(newSupplierPrice),
                reference: newSupplierRef || null,
                isDefault: formSuppliers.length === 0 && !hasDefault,
            },
        ]);
        setNewSupplierId("");
        setNewSupplierPrice("");
        setNewSupplierRef("");
    };

    const handleRemoveSupplier = (index: number) => {
        setFormSuppliers(formSuppliers.filter((_, i) => i !== index));
    };

    const handleSetDefaultSupplier = (index: number) => {
        setFormSuppliers(formSuppliers.map((s, i) => ({
            ...s,
            isDefault: i === index,
        })));
    };

    const photoSource = pendingPhotoPreview || existingPhoto;

    // Lecture du SKU au submit (l'ex-effet le faisait dès la réception de la
    // query) : le champ reste dans l'état RHF jusqu'ici, handleSubmit reçoit
    // donc `code` renseigné — requis par productSchema (min 1) en création.
    const handleFormSubmit = (e: FormEvent<HTMLFormElement>) => {
        if (!isEdit && nextCode?.code) form.setValue("code", nextCode.code);
        return form.handleSubmit(onSubmit)(e);
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Top bar */}
            <div className="border-b bg-muted/30 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => router.back()}>
                        <ArrowLeft className="size-4" />
                    </Button>
                    <div>
                        <h1 className="text-lg font-bold tracking-tight">
                            {isEdit ? "Modifier le produit" : "Nouveau produit"}
                        </h1>
                        <p className="text-xs text-muted-foreground">
                            {isEdit ? "Modifiez les informations" : "Créez un nouveau produit dans votre catalogue"}
                        </p>
                    </div>
                </div>
                <Button type="submit" form="product-form" size="sm" className="h-9 gap-2 text-xs" disabled={saving}>
                    {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                    {saving ? "Enregistrement..." : "Enregistrer"}
                </Button>
            </div>

            <form id="product-form" onSubmit={handleFormSubmit} className="px-6 py-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Section: Infos */}
                        <div>
                            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
                                <Package className="size-4 text-muted-foreground" />
                                Informations générales
                            </h2>
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
                        </div>

                        {/* Section: Prix */}
                        <div>
                            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
                                <DollarSign className="size-4 text-muted-foreground" />
                                Prix & Fiscalité
                            </h2>
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
                        </div>

                        {/* Section: Stock */}
                        <div>
                            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
                                <BarChart3 className="size-4 text-muted-foreground" />
                                Stock
                            </h2>
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
                        </div>

                        {/* Section: Déclinaisons */}
                        <div>
                            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
                                <Shirt className="size-4 text-muted-foreground" />
                                Déclinaisons
                            </h2>
                            <p className="text-xs text-muted-foreground mb-4">Variantes du produit (couleur, taille, etc.)</p>
                            <ProduitVariantsSection variants={variants} onChange={setVariants} />
                        </div>

                        {/* Section: Fournisseurs */}
                        <div>
                            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
                                <Building2 className="size-4 text-muted-foreground" />
                                Fournisseurs
                            </h2>
                            <p className="text-xs text-muted-foreground mb-4">
                                Associé des fournisseurs avec leurs prix d&apos;achat
                            </p>

                            {/* Liste des fournisseurs ajoutés */}
                            {formSuppliers.length > 0 && (
                                <div className="space-y-2 mb-4">
                                    {formSuppliers.map((supplier, index) => {
                                        const supplierList = (fournisseursData?.fournisseurs ?? []) as FournisseurListItem[];
                                        const supplierName = supplierList.find(
                                            (f) => f.id === supplier.supplierId
                                        )?.raisonSociale ?? "Inconnu";
                                        return (
                                            <div
                                                key={supplier.supplierId}
                                                className="flex items-center justify-between p-2.5 rounded-xl bg-muted/50 border hover:bg-muted/80 transition-colors group"
                                            >
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <Building2 className="size-4 text-muted-foreground shrink-0" />
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-medium truncate">{supplierName}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            <span className="tabular-nums">{supplier.purchasePrice.toFixed(3)} DT</span>
                                                            {supplier.reference && <span className="mx-1">·</span>}
                                                            {supplier.reference && <span>{supplier.reference}</span>}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="size-7 shrink-0"
                                                        onClick={() => handleSetDefaultSupplier(index)}
                                                        disabled={supplier.isDefault}
                                                        title={supplier.isDefault ? "Fournisseur par défaut" : "Définir par défaut"}
                                                    >
                                                        <CircleCheck
                                                            className={`size-4 transition-colors ${
                                                                supplier.isDefault
                                                                    ? "fill-amber-500 text-amber-500"
                                                                    : "text-muted-foreground hover:text-amber-500"
                                                            }`}
                                                        />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="size-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                        onClick={() => handleRemoveSupplier(index)}
                                                    >
                                                        <Trash2 className="size-3.5" />
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Formulaire d'ajout */}
                            <div className="flex flex-col sm:flex-row gap-2">
                                <Select value={newSupplierId} onValueChange={setNewSupplierId}>
                                    <SelectTrigger className="h-9 text-sm sm:flex-1">
                                        <SelectValue placeholder="Fournisseur" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {((fournisseursData?.fournisseurs ?? []) as FournisseurListItem[]).map((f) => (
                                            <SelectItem key={f.id} value={f.id}>{f.raisonSociale}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Input
                                    type="number"
                                    step="0.001"
                                    min="0"
                                    value={newSupplierPrice}
                                    onChange={(e) => setNewSupplierPrice(e.target.value)}
                                    placeholder="Prix d'achat"
                                    className="h-9 text-sm sm:w-32"
                                />
                                <Input
                                    value={newSupplierRef}
                                    onChange={(e) => setNewSupplierRef(e.target.value)}
                                    placeholder="Référence"
                                    className="h-9 text-sm sm:w-32"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-9 gap-1"
                                    onClick={handleAddSupplier}
                                    disabled={!newSupplierId || !newSupplierPrice}
                                >
                                    <Plus className="size-3.5" />
                                    Ajouter
                                </Button>
                            </div>
                            {formSuppliers.length === 0 && (
                                <p className="text-[10px] text-muted-foreground mt-2">
                                    Aucun fournisseur ajouté. Le prix d&apos;achat servira par défaut.
                                </p>
                            )}
                        </div>

                        {/* Section: Photo */}
                        <div>
                            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
                                <ImagePlus className="size-4 text-muted-foreground" />
                                Photo du produit
                            </h2>
                            {photoSource ? (
                                <div className="relative inline-block group">
                                    <Image src={photoSource} alt="Aperçu" width={256} height={256} unoptimized className="w-48 h-48 object-cover rounded-2xl border" />
                                    <button
                                        type="button"
                                        onClick={handlePhotoRemove}
                                        className="absolute top-2 right-2 bg-background/80 backdrop-blur rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity border shadow-sm"
                                    >
                                        <X className="size-3.5" />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => photoInputRef.current?.click()}
                                    className="w-48 h-48 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 hover:border-muted-foreground/50 transition-colors bg-muted/20"
                                >
                                    <Upload className="size-6 text-muted-foreground/60" />
                                    <span className="text-xs text-muted-foreground">Ajouter une photo</span>
                                    <span className="text-[10px] text-muted-foreground/60">JPEG, PNG, WebP</span>
                                </button>
                            )}
                            <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handlePhotoSelect} />
                        </div>

                        {/* Section: Fiches techniques */}
                        <div>
                            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
                                <FileText className="size-4 text-muted-foreground" />
                                Fiches techniques (PDF)
                            </h2>
                            <div className="flex flex-wrap gap-3 items-start">
                                <button
                                    type="button"
                                    onClick={() => ficheInputRef.current?.click()}
                                    className="w-36 h-28 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-1.5 hover:border-muted-foreground/50 transition-colors bg-muted/20"
                                >
                                    <Upload className="size-5 text-muted-foreground/60" />
                                    <span className="text-[10px] text-muted-foreground">Ajouter PDF</span>
                                </button>
                                {pendingFiches.map((f, i) => (
                                    <div key={i} className="flex items-center gap-2 h-9 px-3 rounded-xl bg-muted border text-xs">
                                        <FileText className="size-3.5 text-blue-600 shrink-0" />
                                        <span className="truncate max-w-[120px]">{f.name}</span>
                                    </div>
                                ))}
                            </div>
                            <input ref={ficheInputRef} type="file" accept="application/pdf" multiple className="hidden" onChange={handleFicheSelect} />
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        <div className="rounded-2xl border">
                            <div className="p-5 pb-3">
                                <h3 className="text-xs font-semibold flex items-center gap-2">
                                    <Package className="size-3.5 text-muted-foreground" />
                                    Catégorie
                                </h3>
                                <p className="text-[10px] text-muted-foreground mt-0.5">Classement du produit dans l&apos;arborescence</p>
                            </div>
                            <div className="px-5 pb-5">
                                <CategoryTreeSelect
                                    value={form.watch("categorieId")}
                                    onValueChange={(v) => form.setValue("categorieId", v)}
                                />
                            </div>
                        </div>

                        <div className="rounded-2xl border">
                            <div className="p-5 pb-3">
                                <h3 className="text-xs font-semibold flex items-center gap-2">
                                    <Tag className="size-3.5 text-muted-foreground" />
                                    Marque
                                </h3>
                                <p className="text-[10px] text-muted-foreground mt-0.5">Marque ou fabricant du produit</p>
                            </div>
                            <div className="px-5 pb-5">
                                <MarqueSelect
                                    value={form.watch("marqueId")}
                                    onValueChange={(v) => form.setValue("marqueId", v)}
                                />
                            </div>
                        </div>

                        <div className="rounded-2xl border">
                            <div className="p-5 pb-3">
                                <h3 className="text-xs font-semibold flex items-center gap-2">
                                    <Building2 className="size-3.5 text-muted-foreground" />
                                    Fournisseur attitré
                                </h3>
                                <p className="text-[10px] text-muted-foreground mt-0.5">Fournisseur principal du produit</p>
                            </div>
                            <div className="px-5 pb-5">
                                <Select
                                    value={form.watch("tiersId") ?? "__null__"}
                                    onValueChange={(v) => form.setValue("tiersId", v === "__null__" ? null : v)}
                                >
                                    <SelectTrigger className="h-9 text-sm">
                                        <SelectValue placeholder="Aucun" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__null__">Aucun</SelectItem>
                                        {fournisseursData?.fournisseurs
                                            .filter(
                                                (f): f is FournisseurListItem =>
                                                    typeof f.id === "string" && typeof f.raisonSociale === "string"
                                            )
                                            .map((f) => (
                                                <SelectItem key={f.id} value={f.id}>{f.raisonSociale}</SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="rounded-2xl border">
                            <div className="p-5 pb-3">
                                <h3 className="text-xs font-semibold flex items-center gap-2">
                                    <QrCode className="size-3.5 text-muted-foreground" />
                                    QR Code
                                </h3>
                                <p className="text-[10px] text-muted-foreground mt-0.5">Afficher la fiche produit sur mobile</p>
                            </div>
                            <div className="px-5 pb-5 flex flex-col items-center">
                                <div className="bg-white rounded-xl p-2 flex justify-center">
                                    <ProductQRCode codeBarre={qrPreviewData} nom={watched.nom || "Nom produit"} code={watched.code || "CODE"} compact />
                                </div>
                                <p className="text-[10px] text-muted-foreground text-center mt-2">Généré à l&apos;enregistrement</p>
                            </div>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}
