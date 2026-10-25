"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { uploadProductPhoto, deleteProductPhoto } from "@/app/actions/products";
import { notify } from "@/lib/notify";

export function useProductPhotoUpload(productId: string) {
  const qc = useQueryClient();
  const productKey = ["product", productId] as const;

  const upload = useMutation({
    mutationFn: async (formData: FormData) => {
      return uploadProductPhoto(productId, formData);
    },
    onSuccess: () => {
      notify.success({ title: "Photo du produit ajoutée" });
      qc.invalidateQueries({ queryKey: productKey });
    },
    onError: (err: unknown) => {
      notify.error({
        title: "Ajout de la photo impossible",
        error: err,
        context: "lors de l'ajout de la photo du produit",
      });
    },
  });

  const remove = useMutation({
    mutationFn: async () => {
      return deleteProductPhoto(productId);
    },
    onSuccess: () => {
      notify.success({ title: "Photo du produit supprimée" });
      qc.invalidateQueries({ queryKey: productKey });
    },
    onError: (err: unknown) => {
      notify.error({
        title: "Suppression de la photo impossible",
        error: err,
        context: "lors de la suppression de la photo du produit",
      });
    },
  });

  return { upload, remove };
}
