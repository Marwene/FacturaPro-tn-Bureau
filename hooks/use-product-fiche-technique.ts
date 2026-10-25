"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { uploadFicheTechnique, deleteFicheTechnique, deleteProductFiche } from "@/app/actions/products";
import { queryKeys } from "@/lib/query-keys";
import { notify } from "@/lib/notify";

interface FicheTechnique {
  id: string;
  nom: string;
  url: string;
  createdAt: string;
}

interface FichesResponse {
  fiches: FicheTechnique[];
  legacyFicheUrl: string | null;
}

export function useProductFiches(productId: string) {
  return useQuery<FichesResponse>({
    queryKey: queryKeys.produits.fiches(productId),
    queryFn: async () => {
      const res = await fetch(`/api/products/${productId}/fiches`);
      if (!res.ok) throw new Error("Erreur");
      return res.json();
    },
  });
}

export function useProductFicheTechnique(productId: string) {
  const qc = useQueryClient();
  const productKey = queryKeys.produits.detail(productId);

  const upload = useMutation({
    mutationFn: async (formData: FormData) => {
      return uploadFicheTechnique(productId, formData);
    },
    onSuccess: () => {
      notify.success({ title: "Fiche technique ajoutée au produit" });
      qc.invalidateQueries({ queryKey: productKey });
    },
    onError: (err: unknown) => {
      notify.error({
        title: "Ajout de la fiche technique impossible",
        error: err,
        context: "lors de l'ajout de la fiche technique du produit",
      });
    },
  });

  const remove = useMutation({
    mutationFn: async () => {
      return deleteFicheTechnique(productId);
    },
    onSuccess: () => {
      notify.success({ title: "Fiche technique supprimée du produit" });
      qc.invalidateQueries({ queryKey: productKey });
    },
    onError: (err: unknown) => {
      notify.error({
        title: "Suppression de la fiche technique impossible",
        error: err,
        context: "lors de la suppression de la fiche technique du produit",
      });
    },
  });

  const deleteFiche = useMutation({
    mutationFn: async (ficheId: string) => {
      return deleteProductFiche(productId, ficheId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.produits.fiches(productId) });
      notify.success({ title: "Fiche technique supprimée" });
    },
    onError: (err: unknown) =>
      notify.error({
        title: "Suppression de la fiche impossible",
        error: err,
        context: "lors de la suppression d'une fiche technique du produit",
      }),
  });

  return { upload, remove, deleteFiche };
}
