"use client";

import type { SerializedAchat } from "@/lib/types";
import type { AchatCategorie } from "@/lib/types";
import { ACHAT_CATEGORIE_LABELS } from "@/lib/stores/achats-store";
import { SectionCard } from "@/components/shared/section-card";
import { FormField } from "@/components/shared/form-field";
import { MoneyCell } from "@/components/shared/money-cell";
import { Separator } from "@/components/ui/separator";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useAchatBls, useUpdateAchatMeta } from "@/hooks/use-achats-queries";
import { formatCurrency } from "@/lib/decimal";
import { notify } from "@/lib/notify";

interface AchatDetailSidebarProps {
    achat: SerializedAchat;
    tiersEntity?: {
        raisonSociale: string;
        matriculeFiscal?: string;
        adresse?: string;
        ville?: string;
        telephone?: string;
        email?: string;
    };
}

export function AchatDetailSidebar({ achat, tiersEntity }: AchatDetailSidebarProps) {
    const updateMeta = useUpdateAchatMeta();
    const { data: blsData } = useAchatBls(achat.tiersId);
    const bls = blsData?.achats ?? [];

    const handleCategorie = (v: string) =>
        updateMeta.mutate(
            { id: achat.id, categorieAchat: v === "none" ? null : (v as AchatCategorie) },
            {
                onSuccess: () =>
                    notify.success({
                        title: `Achat ${achat.numero} mis à jour`,
                        description: v === "none" ? "Catégorie d'achat retirée." : `Catégorie « ${ACHAT_CATEGORIE_LABELS[v as AchatCategorie]} » appliquée.`,
                    }),
                onError: (err) => notify.error({ title: "Catégorie non enregistrée", error: err, context: "modification de la catégorie d'achat" }),
            }
        );

    const handleBl = (v: string) =>
        updateMeta.mutate(
            { id: achat.id, blAchatId: v === "none" ? null : v },
            {
                onSuccess: () =>
                    notify.success({
                        title: achat.blAchatId
                            ? `BL dissocié de la facture ${achat.numero}`
                            : `Facture ${achat.numero} rattachée au BL ${bls.find((bl) => bl.id === v)?.numero ?? ""}`.trim(),
                    }),
                onError: (err) => notify.error({ title: "Rattachement au BL impossible", error: err, context: "rattachement de la facture à un BL" }),
            }
        );

    return (
        <div className="space-y-4">
            <SectionCard title="Catégorie & BL" contentClassName="pt-3 space-y-3">
                    <FormField label="Catégorie d&apos;achat" className="gap-1">
                        <Select value={achat.categorieAchat ?? "none"} onValueChange={handleCategorie} disabled={updateMeta.isPending}>
                            <SelectTrigger className="h-8 text-sm w-full">
                                <SelectValue placeholder="Sélectionner une catégorie" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">— Aucune —</SelectItem>
                                {(Object.keys(ACHAT_CATEGORIE_LABELS) as AchatCategorie[]).map((cat) => (
                                    <SelectItem key={cat} value={cat}>
                                        {ACHAT_CATEGORIE_LABELS[cat]}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </FormField>
                    {achat.type === "FACTURE" && (
                        <FormField label="Rattacher au BL d&apos;achat" className="gap-1">
                            <Select value={achat.blAchatId ?? "none"} onValueChange={handleBl} disabled={updateMeta.isPending}>
                                <SelectTrigger className="h-8 text-sm w-full">
                                    <SelectValue placeholder="Sélectionner un BL" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">— Aucun —</SelectItem>
                                    {bls.map((bl) => (
                                        <SelectItem key={bl.id} value={bl.id}>
                                            BL {bl.numero} — {bl.referenceFournisseur ?? (bl.tiers as { raisonSociale?: string })?.raisonSociale ?? ""} — {formatCurrency(bl.totalTTC, "TND")}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </FormField>
                    )}
            </SectionCard>

            <SectionCard title="Fournisseur" contentClassName="pt-3 space-y-1.5 text-sm">
                    <p className="font-semibold">{tiersEntity?.raisonSociale ?? "—"}</p>
                    {tiersEntity?.matriculeFiscal && (
                        <p className="text-xs text-muted-foreground font-mono">
                            MF: {tiersEntity.matriculeFiscal}
                        </p>
                    )}
                    {tiersEntity?.adresse && (
                        <p className="text-xs text-muted-foreground">{tiersEntity.adresse}</p>
                    )}
                    {tiersEntity?.ville && (
                        <p className="text-xs text-muted-foreground">{tiersEntity.ville}</p>
                    )}
                    {tiersEntity?.telephone && (
                        <p className="text-xs text-muted-foreground">{tiersEntity.telephone}</p>
                    )}
                    {tiersEntity?.email && (
                        <p className="text-xs text-muted-foreground">{tiersEntity.email}</p>
                    )}
            </SectionCard>

            <SectionCard title="Récapitulatif" contentClassName="pt-3 space-y-2">
                    {[
                        { label: "Base HT", value: achat.baseHT },
                        { label: "Total HT", value: achat.totalHT },
                        { label: "TVA", value: achat.totalTVA },
                        { label: "Total TTC", value: achat.totalTTC, bold: true },
                        { label: "Timbre fiscal", value: achat.timbreFiscal },
                    ].map((row) => (
                        <div key={row.label} className="flex justify-between items-center">
                            <span className={`text-xs ${row.bold ? "font-semibold" : "text-muted-foreground"}`}>
                                {row.label}
                            </span>
                            <span className={`text-xs ${row.bold ? "font-bold" : ""}`}>
                                <MoneyCell value={row.value} />
                            </span>
                        </div>
                    ))}
                    <Separator />
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-bold">Net à Payer</span>
                        <span className="text-sm font-bold">
                            <MoneyCell value={achat.totalTTC} />
                        </span>
                    </div>
            </SectionCard>
        </div>
    );
}
