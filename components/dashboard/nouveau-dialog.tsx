"use client"
import { useRouter } from "next/navigation";
import { useDashboardStore } from "@/lib/stores/dashboard-store";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Button } from "../ui/button";
import { Plus, FileText, ShoppingCart, Truck, ReceiptText, ScrollText } from "lucide-react";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";

type DocType = "devis" | "bon-commande" | "bon-livraison" | "facture" | "avoir";

const options: { value: DocType; label: string; description: string; icon: React.ReactNode; disabled?: boolean }[] = [
    {
        value: "devis",
        label: "Devis",
        description: "Créer un nouveau devis.",
        icon: <FileText className="h-4 w-4" />,
    },
    {
        value: "bon-commande",
        label: "Bon de Commande",
        description: "Créer un nouveau bon de commande.",
        icon: <ShoppingCart className="h-4 w-4" />,
    },
    {
        value: "bon-livraison",
        label: "Bon de Livraison",
        description: "Créer un nouveau bon de livraison.",
        icon: <Truck className="h-4 w-4" />,
    },
    {
        value: "facture",
        label: "Facture",
        description: "Créer une nouvelle facture.",
        icon: <ReceiptText className="h-4 w-4" />,
    },
    {
        value: "avoir",
        label: "Avoir",
        description: "Créer un nouvel avoir.",
        icon: <ScrollText className="h-4 w-4" />,
        disabled: true,
    },
];

export function NouveauDialog() {
    const { nouveauOpen, setNouveauOpen, selectedDocType, setSelectedDocType } = useDashboardStore();
    const router = useRouter();

    function handleCreate() {
        if (!selectedDocType) return;

        switch (selectedDocType) {
            case "facture":
                router.push("/factures/new");
                break;
            case "devis":
                router.push("/devis/new");
                break;
            case "bon-commande":
                router.push("/bons-commande/new");
                break;
            case "bon-livraison":
                router.push("/bons-livraison/nouveau");
                break;
            default:
                notify.warning({ title: "Fonctionnalité bientôt disponible", description: "Ce type de document n'est pas encore accessible depuis ce raccourci." });
                break;
        }

        setNouveauOpen(false);
        setSelectedDocType(null);
    }

    return (
        <>
            <Button size="sm" className="gap-1.5 text-xs" onClick={() => setNouveauOpen(true)}>
                <Plus className="h-3.5 w-3.5" />
                Nouveau
            </Button>
            <Dialog open={nouveauOpen} onOpenChange={(open) => { setNouveauOpen(open); if (!open) setSelectedDocType(null); }}>
                <DialogContent className="sm:max-w-sm max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-sm font-semibold">Nouveau</DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Sélectionnez un type de document pour commencer
                        </DialogDescription>
                    </DialogHeader>
                    <Separator />
                    <div className="space-y-1">
                        {options.map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                disabled={opt.disabled}
                                onClick={() => setSelectedDocType(opt.value)}
                                className={cn(
                                    "flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
                                    selectedDocType === opt.value
                                        ? "border-primary bg-primary/5"
                                        : "border-transparent hover:bg-muted",
                                    opt.disabled && "cursor-not-allowed opacity-50",
                                )}
                            >
                                <span className={cn(
                                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                                    selectedDocType === opt.value
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-muted text-muted-foreground",
                                )}>
                                    {opt.icon}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium">{opt.label}</div>
                                    <div className="text-xs text-muted-foreground truncate">{opt.description}</div>
                                </div>
                                <span className={cn(
                                    "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                                    selectedDocType === opt.value
                                        ? "border-primary bg-primary"
                                        : "border-muted-foreground/30",
                                )}>
                                    {selectedDocType === opt.value && (
                                        <span className="h-1.5 w-1.5 rounded-full bg-white" />
                                    )}
                                </span>
                            </button>
                        ))}
                    </div>
                    <Separator />
                    <DialogFooter>
                        <Button variant="outline" size="sm" onClick={() => { setNouveauOpen(false); setSelectedDocType(null); }}>
                            Annuler
                        </Button>
                        <Button size="sm" onClick={handleCreate} disabled={!selectedDocType}>
                            Créer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
