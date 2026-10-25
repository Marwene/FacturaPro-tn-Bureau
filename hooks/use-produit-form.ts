"use client";

import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { productSchema, type ProductInput } from "@/lib/schemas";
import { useProduitsMutations, useProduitNextCode } from "@/hooks/use-produits";
import { useSyncProductVariants } from "@/hooks/use-product-variants";
import { useProduitFormFiles } from "@/hooks/use-produit-form-files";
import { useProduitFormSuppliers } from "@/hooks/use-produit-form-suppliers";
import { notify } from "@/lib/notify";
import { useRouter } from "next/navigation";
import { useMemo, useDeferredValue, useState, type FormEvent } from "react";
import { generateProductQRData } from "@/lib/qr-data";
import type { SerializedProduct, SerializedProductVariant } from "@/lib/types";
import type { VariantFormData } from "@/components/produits/produit-variants-section";

export type ProduitFormProduct = Omit<
    SerializedProduct,
    "categorieName" | "marqueName" | "tiersName" | "prixAchatDefault" | "createdAt" | "updatedAt" | "variants"
> & {
    variants?: Omit<SerializedProductVariant, "createdAt" | "updatedAt">[];
};

export function useProduitForm(product?: ProduitFormProduct) {
    const router = useRouter();
    const { createProduct, updateProduct } = useProduitsMutations();
    const isEdit = !!product;
    const [saving, setSaving] = useState(false);

    const files = useProduitFormFiles({
        productId: product?.id,
        initialPhoto: product?.photoUrl ?? null,
    });
    const suppliers = useProduitFormSuppliers(product?.suppliers);

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
    const [variants, setVariants] = useState<VariantFormData[]>(() => {
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
        const prixAchatMatch = suppliers.formSuppliers.some(
            (s) => parseFloat(String(data.prixHT)) === s.purchasePrice
        );
        if (suppliers.formSuppliers.length > 0 && prixAchatMatch) {
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
                await updateProduct.mutateAsync({ id: product.id, data: { ...data, suppliers: suppliers.formSuppliers } });
                if (variants.length > 0) await syncVariants.mutateAsync({ productId: product.id, variants });
                if (files.pendingPhoto) await files.uploadPhoto.mutateAsync({ productId: product.id, file: files.pendingPhoto });
                for (const f of files.pendingFiches) await files.uploadFiche.mutateAsync({ productId: product.id, file: f });
                notify.success({ title: `Produit « ${data.nom} » modifié` });
                router.push(`/produits/${product.id}`);
            } else {
                // Create mode: save product, then sync variants + upload files
                const res = await createProduct.mutateAsync({ ...data, suppliers: suppliers.formSuppliers });
                const newId = res.product.id;
                if (variants.length > 0) {
                    await syncVariants.mutateAsync({ productId: newId, variants });
                }
                if (files.pendingPhoto) await files.uploadPhoto.mutateAsync({ productId: newId, file: files.pendingPhoto });
                for (const f of files.pendingFiches) await files.uploadFiche.mutateAsync({ productId: newId, file: f });
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

    // Lecture du SKU au submit (l'ex-effet le faisait dès la réception de la
    // query) : le champ reste dans l'état RHF jusqu'ici, handleSubmit reçoit
    // donc `code` renseigné — requis par productSchema (min 1) en création.
    const handleFormSubmit = (e: FormEvent<HTMLFormElement>) => {
        if (!isEdit && nextCode?.code) form.setValue("code", nextCode.code);
        return form.handleSubmit(onSubmit)(e);
    };

    return {
        form,
        isEdit,
        saving,
        variants,
        setVariants,
        codeValue,
        qrPreviewData,
        watched,
        handleFormSubmit,
        files,
        suppliers,
    };
}

export type ProduitFormController = ReturnType<typeof useProduitForm>;
