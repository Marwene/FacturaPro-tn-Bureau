"use client";

import { Button } from "@/components/ui/button";
import { useFournisseurs } from "@/hooks/use-fournisseurs-queries";
import { useProduitForm, type ProduitFormProduct } from "@/hooks/use-produit-form";
import {
    ProduitFormInfosSection,
    ProduitFormPricingSection,
    ProduitFormStockSection,
    ProduitFormVariantsSection,
} from "./produit-form-main-sections";
import { ProduitFormSuppliersSection } from "./produit-form-suppliers-section";
import { ProduitFormPhotoSection, ProduitFormFichesSection } from "./produit-form-media-sections";
import { ProduitFormSidebar } from "./produit-form-sidebar";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export function ProduitFormPage({ product }: { product?: ProduitFormProduct }) {
    const router = useRouter();
    const { data: fournisseursData } = useFournisseurs();
    const fournisseurs = fournisseursData?.fournisseurs ?? [];
    const {
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
    } = useProduitForm(product);

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
                        <ProduitFormInfosSection form={form} isEdit={isEdit} codeValue={codeValue} />
                        <ProduitFormPricingSection form={form} />
                        <ProduitFormStockSection form={form} />
                        <ProduitFormVariantsSection variants={variants} onChange={setVariants} />
                        <ProduitFormSuppliersSection suppliers={suppliers} fournisseurs={fournisseurs} />
                        <ProduitFormPhotoSection files={files} />
                        <ProduitFormFichesSection files={files} />
                    </div>

                    {/* Sidebar */}
                    <ProduitFormSidebar
                        form={form}
                        fournisseurs={fournisseurs}
                        qrPreviewData={qrPreviewData}
                        qrNom={watched.nom || "Nom produit"}
                        qrCode={watched.code || "CODE"}
                    />
                </div>
            </form>
        </div>
    );
}
