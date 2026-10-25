"use client";

import { useRef, useState } from "react";
import { notify } from "@/lib/notify";
import { useProduitFichiersMutations } from "@/hooks/use-produits";

interface UseProduitFormFilesOptions {
    productId?: string;
    initialPhoto: string | null;
}

export function useProduitFormFiles({ productId, initialPhoto }: UseProduitFormFilesOptions) {
    // ── File state ──
    const [pendingPhoto, setPendingPhoto] = useState<File | null>(null);
    const [pendingPhotoPreview, setPendingPhotoPreview] = useState<string | null>(null);
    const [pendingFiches, setPendingFiches] = useState<File[]>([]);
    const [existingPhoto, setExistingPhoto] = useState<string | null>(initialPhoto);

    const photoInputRef = useRef<HTMLInputElement>(null);
    const ficheInputRef = useRef<HTMLInputElement>(null);

    const { uploadPhoto, uploadFiche, deletePhoto } = useProduitFichiersMutations();

    // ── Photo handlers ──
    const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (productId) {
            // Upload directly
            uploadPhoto.mutateAsync({ productId, file }).then(() => {
                setExistingPhoto(`/uploads/products/${productId}/photo-${Date.now()}.${file.type.split("/")[1]}`);
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
        if (productId) {
            try {
                await deletePhoto.mutateAsync(productId);
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
        if (productId) {
            Promise.all(files.map((f) => uploadFiche.mutateAsync({ productId, file: f })))
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

    const photoSource = pendingPhotoPreview || existingPhoto;

    return {
        pendingPhoto,
        pendingFiches,
        photoSource,
        photoInputRef,
        ficheInputRef,
        uploadPhoto,
        uploadFiche,
        handlePhotoSelect,
        handlePhotoRemove,
        handleFicheSelect,
    };
}

export type ProduitFormFilesController = ReturnType<typeof useProduitFormFiles>;
