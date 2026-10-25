import { NextRequest, NextResponse } from "next/server";
import { refreshTMM } from "@/lib/tmm-bct";
import { guardCronRequest } from "@/lib/cron-auth";

export async function GET(request: NextRequest) {
    // Garde échec fermé (audit S-8) : le cron Vercel envoie
    // `Authorization: Bearer ${CRON_SECRET}` — sans variable posée (ou sans
    // header valide), l'appel est refusé AVANT tout accès DB.
    const refused = guardCronRequest(request, "tmm-bct");
    if (refused) return refused;

    try {
        const result = await refreshTMM();
        return NextResponse.json({ success: true, tmm: result.tmm, date: result.date });
    } catch (err) {
        console.error("[cron/tmm-bct]", err);
        return NextResponse.json({ success: false, error: "Erreur lors du rafraîchissement du TMM" }, { status: 500 });
    }
}