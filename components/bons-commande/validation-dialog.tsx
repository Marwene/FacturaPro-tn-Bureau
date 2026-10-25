"use client";

import { useRouter } from "next/navigation";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useBCValidation } from "@/hooks/use-bc";
import { useBCRapprochement } from "@/hooks/use-bc-rapprochement";
import { useBCDetailStore } from "@/lib/stores/bons-commande-store";
import { FileText, Truck, Loader2, AlertTriangle } from "lucide-react";
import { notify } from "@/lib/notify";

interface ValidationDialogProps {
    bonCommandeId: string;
    tiersId: string;
    companyId: string | null;
}

export function ValidationDialog({ bonCommandeId, tiersId, companyId }: ValidationDialogProps) {
    const router = useRouter();
    const { showValidation, setShowValidation } = useBCDetailStore();
    const validateMutation = useBCValidation();
    const { data: rapprochement } = useBCRapprochement(bonCommandeId);

    const lignesBloquantes = (rapprochement?.lignes ?? []).filter(
        (l) => l.typeSource === "PRODUCTION" && l.statutRapprochement !== "RECONCILIE"
    );
    const honorable = lignesBloquantes.length === 0;

    const handleCreateBL = () => {
        validateMutation.mutate(
            { bonCommandeId, companyId, target: "BL" },
            {
                onSuccess: () => {
                    setShowValidation(false);
                    router.push("/bons-livraison");
                },
                onError: (err: unknown) => {
                    notify.error({
                        title: "Création du bon de livraison impossible",
                        error: err,
                        context: "lors de la création du bon de livraison depuis le bon de commande",
                    });
                },
            }
        );
    };

    const handleCreateFacture = () => {
        validateMutation.mutate(
            { bonCommandeId, companyId, target: "FACTURE" },
            {
                onSuccess: () => {
                    setShowValidation(false);
                    router.push("/factures");
                },
                onError: (err: unknown) => {
                    notify.error({
                        title: "Création de la facture impossible",
                        error: err,
                        context: "lors de la création de la facture depuis le bon de commande",
                    });
                },
            }
        );
    };

    const loading = validateMutation.isPending;

    return (
        <Dialog open={showValidation} onOpenChange={setShowValidation}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Valider le Bon de Commande</DialogTitle>
                    <DialogDescription>
                        Que souhaitez-vous créer à partir de ce bon de commande ?
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    {!honorable && (
                        <div className="flex items-start gap-2 text-sm bg-destructive/5 border border-destructive/20 text-destructive rounded-lg px-3 py-2">
                            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                            <span>
                                Rapprochement non soldé pour {lignesBloquantes.length} article(s) de production. Importez
                                le détail avant de générer un BL ou une facture.
                            </span>
                        </div>
                    )}
                    <Button
                        variant="outline"
                        className="h-24 flex-col gap-2"
                        onClick={handleCreateBL}
                        disabled={loading || !honorable}
                    >
                        {loading ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            <Truck className="h-6 w-6" />
                        )}
                        <div className="text-sm font-medium">Bon de Livraison</div>
                        <div className="text-xs text-muted-foreground">
                            Créer un bon de livraison avec les mêmes articles
                        </div>
                    </Button>
                    <Button
                        variant="outline"
                        className="h-24 flex-col gap-2"
                        onClick={handleCreateFacture}
                        disabled={loading || !honorable}
                    >
                        {loading ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            <FileText className="h-6 w-6" />
                        )}
                        <div className="text-sm font-medium">Facture</div>
                        <div className="text-xs text-muted-foreground">
                            Créer une facture{companyId ? " (BC visé si Offshore)" : ""}
                        </div>
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
