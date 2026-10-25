"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { uploadCompanyLogo, deleteCompanyLogo } from "@/app/actions/companies";
import { notify } from "@/lib/notify";

export function useCompanyLogoUpload(companyId: string) {
  const qc = useQueryClient();
  const companyKey = ["company", companyId] as const;

  const upload = useMutation({
    mutationFn: async (formData: FormData) => {
      return uploadCompanyLogo(companyId, formData);
    },
    onSuccess: () => {
      notify.success({ title: "Logo de l'entreprise ajouté" });
      qc.invalidateQueries({ queryKey: companyKey });
    },
    onError: (err: unknown) => {
      notify.error({
        title: "Ajout du logo impossible",
        error: err,
        context: "lors de l'ajout du logo de l'entreprise",
      });
    },
  });

  const remove = useMutation({
    mutationFn: async () => {
      return deleteCompanyLogo(companyId);
    },
    onSuccess: () => {
      notify.success({ title: "Logo de l'entreprise supprimé" });
      qc.invalidateQueries({ queryKey: companyKey });
    },
    onError: (err: unknown) => {
      notify.error({
        title: "Suppression du logo impossible",
        error: err,
        context: "lors de la suppression du logo de l'entreprise",
      });
    },
  });

  return { upload, remove };
}
