"use client";

import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";

const QRCodeSVG = dynamic(() => import("qrcode.react").then((m) => m.QRCodeSVG), {
    ssr: false,
    loading: () => <div className="size-[160px] bg-muted rounded-lg animate-pulse" />,
});

interface ProductQRCodeProps {
    codeBarre?: string | null;
    nom: string;
    code: string;
    compact?: boolean;
    large?: boolean;
    showMessage?: boolean;
}

export function ProductQRCode({ codeBarre, nom, code, compact, large, showMessage }: ProductQRCodeProps) {
    if (!codeBarre) {
        return (
            <div className="flex items-center justify-center p-4">
                <p className="text-xs text-muted-foreground">QR Code non généré</p>
            </div>
        );
    }

    const size = large ? 220 : compact ? 160 : 180;

    return (
        <div className={cn("flex flex-col items-center gap-3", compact && "scale-[0.65] -my-6")}>
            <div className="bg-white p-1.5 rounded-xl shadow-sm">
                <QRCodeSVG
                    value={codeBarre}
                    size={size}
                    level="H"
                    includeMargin
                />
            </div>
            {showMessage && (
                <div className="text-center space-y-1 max-w-[260px]">
                    <p className="text-sm font-semibold">Scannez pour afficher la fiche produit</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Ouvrez votre caméra, et scanner le QR code pour obtenir télécharger la fiche technique, et les informations du produits.
                    </p>
                </div>
            )}
            {!compact && !showMessage && (
                <p className="text-[10px] text-muted-foreground text-center break-all max-w-full">
                    {code} · {nom}
                </p>
            )}
        </div>
    );
}
