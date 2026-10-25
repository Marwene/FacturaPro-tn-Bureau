"use client";

import { useInvoiceDetail, useInvoiceMutations, useCreatePaymentMutation } from "@/hooks/use-invoices";
import { useSettings, useCompany } from "@/hooks/use-queries";
import { useCompanyStore } from "@/lib/stores/company-store";
import { usePaymentFormStore } from "@/lib/stores/invoices-store";
import { exportDocumentPDF, buildDocumentHTML, invoiceToDocumentOptions, blGroupedInvoiceToDocumentOptions } from "@/lib/export-utils";
import { StatCard } from "@/components/stat-card";
import { KpiGrid } from "@/components/shared/kpi-grid";
import { PaymentDialog } from "@/components/factures/payment-dialog";
import { InvoiceDetailSkeleton } from "@/components/factures/invoice-detail-skeleton";
import { FactureDetailActions } from "@/components/factures/facture-detail-actions";
import { FactureDetailSidebar } from "@/components/factures/facture-detail-sidebar";
import { formatCurrency, deserializeDecimal } from "@/lib/decimal";
import { notify } from "@/lib/notify";
import { FactureDetailInfo } from "./facture-detail-info";
import { FactureDetailLines } from "./facture-detail-lines";

export function FactureDetailClient({ id }: { id: string }) {
    const { data, isLoading } = useInvoiceDetail(id);
    const { updateStatus } = useInvoiceMutations();
    const createPayment = useCreatePaymentMutation();
    const paymentOpen = usePaymentFormStore((s) => s.open);
    const paymentForm = usePaymentFormStore((s) => s.form);
    const setPaymentOpen = usePaymentFormStore((s) => s.setOpen);
    const setPaymentField = usePaymentFormStore((s) => s.setField);
    const resetPayment = usePaymentFormStore((s) => s.reset);
    const { data: settingsData } = useSettings();
    const settings = settingsData?.settings;
    const selectedCompanyId = useCompanyStore((s) => s.selectedCompanyId);
    const { data: companyData } = useCompany(selectedCompanyId);
    const company = companyData?.company;

    if (isLoading) return <InvoiceDetailSkeleton />;
    if (!data) return null;

    const { invoice } = data;
    const client = invoice.tiers as {
        raisonSociale: string;
        matriculeFiscal?: string;
        adresse?: string;
        ville?: string;
        telephone?: string;
        email?: string;
        tauxRetenue: string;
    } | undefined;
    const lines = invoice.lines ?? [];
    const payments = invoice.payments ?? [];

    const companyOverride = company
        ? {
            name: company.name,
            tagline: company.type === "OFFSHORE" ? "Société Offshore" : "Société Locale",
            address: [company.adresse, company.ville, company.codePostal].filter(Boolean).join(", "),
            phone: company.telephone ?? undefined,
            email: company.email ?? undefined,
            mf: company.matriculeFiscal ?? undefined,
        }
        : undefined;

    const hasBL = Boolean(invoice.bonsLivraison && invoice.bonsLivraison.length > 0);

    const handlePrint = () => {
        if (hasBL && invoice.bonsLivraison && invoice.lines) {
            const blGroups = invoice.bonsLivraison.map((blLink) => {
                const blNumero = blLink.bonLivraison?.numero ?? `BL-${blLink.bonLivraisonId.slice(0, 8)}`;
                const blDate = blLink.bonLivraison?.dateLivraison ?? null;
                const blLines = invoice.lines!.filter((l) => l.bonLivraisonId === blLink.bonLivraisonId);
                return { blNumero, blDate, lines: blLines };
            });
            const opts = blGroupedInvoiceToDocumentOptions(invoice, blGroups, settings, undefined, companyOverride);
            const html = buildDocumentHTML(opts, { autoPrint: true });
            const w = window.open("", "_blank", "width=900,height=1100");
            if (!w) return;
            w.document.write(html);
            w.document.close();
        } else {
            const opts = invoiceToDocumentOptions(invoice, settings, undefined, companyOverride);
            const html = buildDocumentHTML(opts, { autoPrint: true });
            const w = window.open("", "_blank", "width=900,height=1100");
            if (!w) return;
            w.document.write(html);
            w.document.close();
        }
    };

    const handlePDF = () => {
        if (hasBL && invoice.bonsLivraison && invoice.lines) {
            const blGroups = invoice.bonsLivraison.map((blLink) => {
                const blNumero = blLink.bonLivraison?.numero ?? `BL-${blLink.bonLivraisonId.slice(0, 8)}`;
                const blDate = blLink.bonLivraison?.dateLivraison ?? null;
                const blLines = invoice.lines!.filter((l) => l.bonLivraisonId === blLink.bonLivraisonId);
                return { blNumero, blDate, lines: blLines };
            });
            const opts = blGroupedInvoiceToDocumentOptions(invoice, blGroups, settings, undefined, companyOverride);
            exportDocumentPDF(opts);
        } else {
            const opts = invoiceToDocumentOptions(invoice, settings, undefined, companyOverride);
            exportDocumentPDF(opts);
        }
    };

    const resteAPayer = deserializeDecimal(invoice.resteAPayer);
    const montantPaye = deserializeDecimal(invoice.montantPaye);
    const totalTTC = deserializeDecimal(invoice.totalTTC);
    const progressPct = totalTTC.gt(0)
        ? Math.min(montantPaye.div(totalTTC).times(100).toNumber(), 100)
        : 0;

    const handleSendInvoice = () => {
        updateStatus.mutate(
            { id, status: "ENVOYEE" },
            {
                onSuccess: () => notify.success({ title: `Facture ${invoice.numero} envoyée` }),
                onError: (err) => notify.error({ title: "Envoi impossible", error: err, context: "marquage de la facture comme envoyée" }),
            }
        );
    };

    const handleMarkPaid = () => {
        updateStatus.mutate(
            { id, status: "PAYEE" },
            {
                onSuccess: () => notify.success({ title: `Facture ${invoice.numero} payée` }),
                onError: (err) => notify.error({ title: "Mise à jour impossible", error: err, context: "marquage de la facture comme payée" }),
            }
        );
    };

    const handlePaymentSubmit = () => {
        const montant = parseFloat(paymentForm.montant);
        if (!montant || montant <= 0) {
            notify.error({ title: "Paiement non enregistré", error: "Saisissez un montant supérieur à 0." });
            return;
        }
        createPayment.mutate(
            {
                invoiceId: id,
                tiersId: invoice.tiersId,
                montant,
                methode: paymentForm.methode,
                reference: paymentForm.reference || null,
                dateReglement: paymentForm.dateReglement,
                notes: paymentForm.notes || null,
            },
            {
                onSuccess: () => {
                    notify.success({ title: "Paiement enregistré", description: `Facture ${invoice.numero} : mise à jour du solde.` });
                    resetPayment();
                },
                onError: (err) => notify.error({ title: "Paiement non enregistré", error: err, context: "enregistrement du paiement" }),
            }
        );
    };

    return (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <FactureDetailActions
                invoice={invoice}
                onPrint={handlePrint}
                onPDF={handlePDF}
                onSend={handleSendInvoice}
                onMarkPaid={handleMarkPaid}
                onRecordPayment={() => setPaymentOpen(true, resteAPayer.toFixed(3))}
                isPending={updateStatus.isPending}
            />

            {/* KPI cards */}
            <KpiGrid columns={4} className="grid-cols-4 sm:grid-cols-4 gap-3">
                <StatCard
                    title="Total TTC"
                    value={formatCurrency(invoice.totalTTC, invoice.devise)}
                />
                <StatCard
                    title="Payé"
                    value={formatCurrency(invoice.montantPaye, invoice.devise)}
                    subtitleVariant={montantPaye.gt(0) ? "success" : "default"}
                />
                <StatCard
                    title="Reste à Payer"
                    value={formatCurrency(invoice.resteAPayer, invoice.devise)}
                    subtitleVariant={resteAPayer.gt(0) ? "danger" : "success"}
                />
                <StatCard
                    title="Retenue Source"
                    value={formatCurrency(invoice.totalRetenue, invoice.devise)}
                />
            </KpiGrid>

            <div className="grid grid-cols-3 gap-4">
                {/* Left: invoice info + lines */}
                <div className="col-span-2 space-y-4">
                    <FactureDetailInfo invoice={invoice} progressPct={progressPct} />
                    <FactureDetailLines invoice={invoice} lines={lines} payments={payments} />
                </div>

                <FactureDetailSidebar
                    invoice={invoice}
                    client={client}
                    resteAPayer={resteAPayer}
                    montantPaye={montantPaye}
                />
            </div>

            <PaymentDialog
                open={paymentOpen}
                onOpenChange={setPaymentOpen}
                maxAmount={resteAPayer.toFixed(3)}
                form={{
                    montant: paymentForm.montant,
                    methode: paymentForm.methode,
                    reference: paymentForm.reference,
                    dateReglement: paymentForm.dateReglement,
                    notes: paymentForm.notes,
                }}
                onFieldChange={(field, value) => setPaymentField(field as keyof typeof paymentForm, value)}
                onSubmit={handlePaymentSubmit}
                isPending={createPayment.isPending}
            />
        </div>
    );
}

