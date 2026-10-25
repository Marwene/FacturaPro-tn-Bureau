"use client";

import type { SerializedAchat } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AchatStatusBadge } from "@/components/status-badge";
import { PageHeader } from "@/components/shared/page-header";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle, XCircle } from "lucide-react";

interface AchatDetailActionsProps {
    achat: SerializedAchat;
    onValidate: () => void;
    onCancel: () => void;
    isPending: boolean;
}

export function AchatDetailActions({ achat, onValidate, onCancel, isPending }: AchatDetailActionsProps) {
    const router = useRouter();

    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => router.back()}
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Retour
                </Button>
                <Separator orientation="vertical" className="h-4" />
                <PageHeader title={achat.numero} className="min-w-0" />
                <AchatStatusBadge status={achat.status} />
            </div>
            <div className="flex items-center gap-2">
                {achat.status === "BROUILLON" && (
                    <Button
                        size="sm"
                        className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700"
                        onClick={onValidate}
                        disabled={isPending}
                    >
                        <CheckCircle className="h-3.5 w-3.5" />
                        Valider
                    </Button>
                )}
                {achat.status === "VALIDEE" && (
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs text-orange-600"
                        onClick={onCancel}
                        disabled={isPending}
                    >
                        <XCircle className="h-3.5 w-3.5" />
                        Annuler
                    </Button>
                )}
            </div>
        </div>
    );
}
