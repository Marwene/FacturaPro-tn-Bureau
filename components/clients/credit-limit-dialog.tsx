"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/shared/form-field";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { formatTND } from "@/lib/decimal";
import { notify } from "@/lib/notify";
import { useClientBlocageMutations } from "@/hooks/use-clients";
import { Euro, ShieldCheck } from "lucide-react";

export function CreditLimitDialog({
    clientId,
    currentLimit,
}: {
    clientId: string;
    currentLimit: string;
}) {
    const [open, setOpen] = useState(false);
    const [value, setValue] = useState(currentLimit);
    const { updateCreditLimit } = useClientBlocageMutations(clientId);

    const handleSubmit = () => {
        const num = parseFloat(value);
        if (isNaN(num) || num < 0) {
            notify.error({ title: "Plafond non modifié", error: "Saisissez un montant positif." });
            return;
        }
        updateCreditLimit.mutate(num, {
            onSuccess: () => {
                notify.success({ title: "Plafond de crédit mis à jour", description: `Nouveau plafond : ${formatTND(num)}.` });
                setOpen(false);
            },
            onError: (err) => notify.error({ title: "Plafond non modifié", error: err, context: "mise à jour du plafond de crédit" }),
        });
    };

    return (
        <>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setOpen(true)}>
                <Euro className="h-3.5 w-3.5" />
                {parseFloat(currentLimit) > 0 ? "Modifier le plafond" : "Définir un plafond"}
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="text-sm font-semibold flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4" />
                            Limite de Crédit
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <FormField
                            label="Plafond autorisé (DT)"
                            description="Mettez 0 pour désactiver la limite de crédit."
                            className="gap-1"
                        >
                            <Input
                                type="number"
                                step="0.001"
                                min="0"
                                value={value}
                                onChange={(e) => setValue(e.target.value)}
                                className="h-8 text-sm"
                                placeholder="0 = pas de limite"
                            />
                        </FormField>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
                            Annuler
                        </Button>
                        <Button size="sm" onClick={handleSubmit} disabled={updateCreditLimit.isPending}>
                            {updateCreditLimit.isPending ? "Enregistrement..." : "Enregistrer"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
