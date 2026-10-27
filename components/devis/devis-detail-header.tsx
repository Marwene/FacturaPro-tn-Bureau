"use client";

import { Button } from "@/components/ui/button";
import { QuoteStatusBadge } from "@/components/status-badge";
import { useDevisDetailStore, usePrintOptionsStore } from "@/lib/stores/devis-store";
import { Send, XCircle, BadgeCheck, Eye } from "lucide-react";
import type { SerializedQuote } from "@/lib/types";

type DevisDetailHeaderProps = {
    quote: SerializedQuote;
    canSend: boolean;
    canAccept: boolean;
    canRefuse: boolean;
    updateStatus: { isPending: boolean };
    handleSend: () => void;
    handleAccept: () => void;
    handleRefuse: () => void;
};

/** Page Header — Devis Identity + quick actions (ex-devis-detail-client L169-227). */
export function DevisDetailHeader({ quote, canSend, canAccept, canRefuse, updateStatus, handleSend, handleAccept, handleRefuse }: DevisDetailHeaderProps) {
    const setPreviewOpen = useDevisDetailStore((s) => s.setPreviewOpen);
    return (
        <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
            <div className="max-w-[1400px] mx-auto px-4 py-4">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                        <h1 className="text-2xl font-bold tracking-tight truncate">
                            {quote.numero}
                        </h1>
                        <QuoteStatusBadge status={quote.status} />
                    </div>
                    {/* Quick actions — top level */}
                    <div className="flex items-center gap-2 shrink-0">
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5 active:scale-[0.96] transition-transform duration-150"
                            onClick={() => { usePrintOptionsStore.getState().reset(); setPreviewOpen(true); }}
                        >
                            <Eye className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Aperçu</span>
                        </Button>
                        {canSend && (
                            <Button
                                size="sm"
                                className="gap-1.5 active:scale-[0.96] transition-transform duration-150"
                                onClick={handleSend}
                                disabled={updateStatus.isPending}
                            >
                                <Send className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Envoyer</span>
                            </Button>
                        )}
                        {canAccept && (
                            <Button
                                size="sm"
                                className="gap-1.5 active:scale-[0.96] transition-transform duration-150"
                                onClick={handleAccept}
                                disabled={updateStatus.isPending}
                            >
                                <BadgeCheck className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Accepter</span>
                            </Button>
                        )}
                        {canRefuse && (
                            <Button
                                variant="destructive"
                                size="sm"
                                className="gap-1.5 active:scale-[0.96] transition-transform duration-150"
                                onClick={handleRefuse}
                                disabled={updateStatus.isPending}
                            >
                                <XCircle className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Refuser</span>
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
