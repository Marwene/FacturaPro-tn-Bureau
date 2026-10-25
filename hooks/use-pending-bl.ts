"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { handleApiResponse } from "@/lib/api-error";
import { useCompanyStore } from "@/lib/stores/company-store";
import { queryKeys as blQueryKeys } from "@/hooks/use-bl";
import { queryKeys as invoiceQueryKeys } from "@/hooks/use-invoices";
import { notify } from "@/lib/notify";

type PendingBL = {
  id: string;
  numero: string;
  dateLivraison: string | null;
  totalTTC: string;
  lines: Array<{
    id: string;
    description: string;
    quantite: string;
    prixHT: string;
    totalHT: string;
    tauxTVA: string;
    fodec: boolean;
    product: { id: string; code: string; nom: string } | null;
  }>;
};

type PendingBLClient = {
  clientId: string;
  clientName: string;
  blCount: number;
  totalTTC: number;
  bls: PendingBL[];
};

type PendingBLResponse = {
  clients: PendingBLClient[];
  totalBLs: number;
};

export function usePendingBLs() {
  return useQuery({
    queryKey: ["pending-bl"],
    queryFn: async () => {
      const res = await fetch("/api/invoices/pending-bl");
      return handleApiResponse<PendingBLResponse>(res, "chargement BLs en attente");
    },
  });
}

type CreateInvoiceFromBLPayload = {
  clientId: string;
  blIds: string[];
  dateEmission?: string;
  dateEcheance?: string;
  mode: "consolidee" | "par_bl";
};

type CreateInvoiceFromBLResponse = {
  invoices: Array<{ id: string; numero: string }>;
};

export function useCreateInvoiceFromBL() {
  const qc = useQueryClient();
  const companyId = useCompanyStore((s) => s.selectedCompanyId);

  return useMutation({
    mutationFn: async (data: CreateInvoiceFromBLPayload) => {
      const res = await fetch("/api/invoices/from-bl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return handleApiResponse<CreateInvoiceFromBLResponse>(
        res,
        "création facture depuis BLs"
      );
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["pending-bl"] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      const [blListRootKey] = blQueryKeys.bls();
      qc.invalidateQueries({ queryKey: [blListRootKey] });
      qc.invalidateQueries({ queryKey: invoiceQueryKeys.dashboard(companyId) });

      const [firstInvoice] = data.invoices;
      if (firstInvoice && data.invoices.length === 1) {
        notify.success({
          title: `Facture ${firstInvoice.numero} créée`,
          description: "Disponible dans la liste des factures pour l'envoi ou l'encaissement.",
        });
      } else {
        notify.success({
          title: `${data.invoices.length} factures créées`,
          description: "Disponibles dans la liste des factures pour l'envoi ou l'encaissement.",
        });
      }
    },
    onError: (err: unknown) => {
      notify.error({
        title: "Création des factures impossible",
        error: err,
        context: "lors de la création des factures à partir des bons de livraison",
      });
    },
  });
}
