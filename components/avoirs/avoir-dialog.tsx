"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { useAvoirMutations } from "@/hooks/use-avoirs";
import { useClients, useFournisseurs, useInvoices } from "@/hooks/use-queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Tabs,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import { notify } from "@/lib/notify";
import { Plus } from "lucide-react";
import { EntityFormDialog } from "@/components/shared/entity-form-dialog";
import { AvoirDialogSimpleSection } from "./avoir-dialog-simple-section";
import { AvoirDialogFinancierSection } from "./avoir-dialog-financier-section";

export const quickAvoirSchema = z.object({
    type: z.enum(["SIMPLE", "FINANCIER"]),
    tiersId: z.string().optional(),
    invoiceId: z.string().optional(),
    dateEmission: z.string().min(1, "Date requise"),
    motif: z.string().optional(),
    notes: z.string().optional(),
}).superRefine((data, ctx) => {
    if (data.type === "SIMPLE") {
        if (!data.tiersId) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["tiersId"], message: "Tiers requis" });
        if (!data.invoiceId) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["invoiceId"], message: "Facture requise" });
    }
    if (data.type === "FINANCIER") {
        if (!data.tiersId) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["tiersId"], message: "Tiers requis" });
    }
});

export type QuickAvoirInput = z.infer<typeof quickAvoirSchema>;

export function NouveauAvoirDialog() {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [entityTab, setEntityTab] = useState<"client" | "fournisseur">("client");
    const { createAvoir } = useAvoirMutations();
    const { data: clientsData } = useClients();
    const { data: fournisseursData } = useFournisseurs();
    const clients = clientsData?.clients ?? [];
    const fournisseurs = (fournisseursData?.fournisseurs ?? []) as { id: string; raisonSociale: string }[];

    const { data: invoicesData } = useInvoices();

    const [clientSearch, setClientSearch] = useState("");
    const [fournisseurSearch, setFournisseurSearch] = useState("");
    const [invoiceSearch, setInvoiceSearch] = useState("");

    const formRef = useRef<UseFormReturn<QuickAvoirInput> | null>(null);

    const onSubmit = (data: QuickAvoirInput) => {
        const motif = data.motif || "Avoir";
        const isFinance = data.type === "FINANCIER";

        const payload = {
            type: data.type,
            tiersId: data.tiersId || null,
            invoiceId: data.invoiceId || null,
            dateEmission: data.dateEmission,
            motif: data.motif || null,
            notes: data.notes || null,
            lines: [
                {
                    description: motif,
                    quantite: 1,
                    prixHT: 0,
                    remise: 0,
                    tauxTVA: 0,
                    fodec: false,
                    tauxFodec: 1,
                },
            ],
        };

        createAvoir.mutate(payload as unknown as Record<string, unknown>, {
            onSuccess: (avoir) => {
                notify.success({ title: `Avoir ${avoir.numero} créé`, description: "Il apparaît dans la liste des avoirs." });
                formRef.current?.reset();
                setOpen(false);
                router.refresh();
            },
            onError: (err) => notify.error({ title: "Avoir non créé", error: err, context: "création de l'avoir" }),
        });
    };

    return (
        <>
            <Button size="sm" className="gap-1.5 text-xs" onClick={() => setOpen(true)}>
                <Plus className="h-3.5 w-3.5" />
                Nouvel Avoir
            </Button>

            <EntityFormDialog<QuickAvoirInput, QuickAvoirInput>
                open={open}
                onOpenChange={setOpen}
                title="Nouvel Avoir"
                schema={quickAvoirSchema}
                defaultValues={{
                    type: "SIMPLE",
                    tiersId: undefined,
                    invoiceId: undefined,
                    dateEmission: new Date().toISOString().slice(0, 10),
                    motif: "",
                    notes: "",
                }}
                onSubmit={onSubmit}
                isPending={createAvoir.isPending}
                submitLabel="Créer l'Avoir"
                pendingLabel="Création..."
                cancelLabel="Annuler"
                size="md"
            >
                {(form) => {
                    if (formRef.current !== form) formRef.current = form;

                    const watchType = form.watch("type");
                    const watchClientId = form.watch("tiersId");
                    const selectedClient = watchClientId ? clients.find((c) => c.id === watchClientId) ?? null : null;

                    const invoices = (invoicesData?.invoices ?? []).filter(
                        (inv: { tiersId: string; status: string }) =>
                            inv.tiersId === watchClientId && inv.status !== "ANNULEE"
                    );
                    const watchInvoiceId = form.watch("invoiceId");
                    const selectedInvoice = watchInvoiceId ? invoices.find((inv: { id: string }) => inv.id === watchInvoiceId) ?? null : null;
                    const watchFournisseurId = form.watch("tiersId");
                    const selectedFournisseur = watchFournisseurId ? (fournisseurs.find((f) => (f as { id: string }).id === watchFournisseurId) as { id: string; raisonSociale: string } | undefined ?? null) : null;

                    const filteredClients = clients.filter((c) =>
                        c.raisonSociale.toLowerCase().includes(clientSearch.toLowerCase())
                    );
                    const filteredFournisseurs = fournisseurs.filter((f) =>
                        (f as { raisonSociale: string }).raisonSociale.toLowerCase().includes(fournisseurSearch.toLowerCase())
                    );
                    const filteredInvoices = invoices.filter(
                        (inv: { numero: string }) =>
                            inv.numero.toLowerCase().includes(invoiceSearch.toLowerCase())
                    );

                    const handleClientChange = (c: { id: string; raisonSociale: string } | null) => {
                        form.setValue("tiersId", c?.id);
                        form.setValue("invoiceId", undefined);
                    };

                    const handleInvoiceChange = (inv: { id: string } | null) => {
                        form.setValue("invoiceId", inv?.id);
                    };

                    const handleFinancierClientChange = (c: { id: string; raisonSociale: string } | null) => {
                        form.setValue("tiersId", c?.id);
                    };

                    const handleFinancierFournisseurChange = (f: { id: string; raisonSociale: string } | null) => {
                        form.setValue("tiersId", f?.id);
                    };

                    return (
                        <>
                            <Tabs
                                value={watchType}
                                onValueChange={(v) => {
                                    form.setValue("type", v as "SIMPLE" | "FINANCIER");
                                    form.setValue("tiersId", undefined);
                                    form.setValue("invoiceId", undefined);
                                }}
                            >
                                <TabsList className="h-8">
                                    <TabsTrigger value="SIMPLE" className="text-xs">Avoir Simple (sur facture)</TabsTrigger>
                                    <TabsTrigger value="FINANCIER" className="text-xs">Avoir Financier</TabsTrigger>
                                </TabsList>
                            </Tabs>

                            {watchType === "SIMPLE" ? (
                                <AvoirDialogSimpleSection
                                    form={form}
                                    clients={clients}
                                    invoices={invoices}
                                    selectedClient={selectedClient}
                                    selectedInvoice={selectedInvoice}
                                    filteredClients={filteredClients}
                                    filteredInvoices={filteredInvoices}
                                    clientSearch={clientSearch}
                                    invoiceSearch={invoiceSearch}
                                    onClientSearchChange={setClientSearch}
                                    onInvoiceSearchChange={setInvoiceSearch}
                                    onClientChange={handleClientChange}
                                    onInvoiceChange={handleInvoiceChange}
                                />
                            ) : (
                                <AvoirDialogFinancierSection
                                    form={form}
                                    entityTab={entityTab}
                                    clients={clients}
                                    fournisseurs={fournisseurs}
                                    selectedClient={selectedClient}
                                    selectedFournisseur={selectedFournisseur}
                                    filteredClients={filteredClients}
                                    filteredFournisseurs={filteredFournisseurs}
                                    clientSearch={clientSearch}
                                    fournisseurSearch={fournisseurSearch}
                                    onEntityTabChange={(v) => setEntityTab(v as "client" | "fournisseur")}
                                    onClientSearchChange={setClientSearch}
                                    onFournisseurSearchChange={setFournisseurSearch}
                                    onClientChange={handleFinancierClientChange}
                                    onFournisseurChange={handleFinancierFournisseurChange}
                                />
                            )}

                            <div className="space-y-1">
                                <Label className="text-xs">Date d&apos;Émission</Label>
                                <Input
                                    type="date"
                                    value={form.watch("dateEmission")}
                                    onChange={(e) => form.setValue("dateEmission", e.target.value)}
                                    className="h-8 text-sm"
                                />
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs">Motif</Label>
                                <Input
                                    value={form.watch("motif") ?? ""}
                                    onChange={(e) => form.setValue("motif", e.target.value)}
                                    className="h-8 text-sm"
                                    placeholder="Motif de l'avoir..."
                                />
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs">Notes</Label>
                                <Textarea
                                    value={form.watch("notes") ?? ""}
                                    onChange={(e) => form.setValue("notes", e.target.value)}
                                    className="text-sm resize-none h-20"
                                    placeholder="Notes complémentaires..."
                                />
                            </div>
                        </>
                    );
                }}
            </EntityFormDialog>
        </>
    );
}
