import { NextRequest, NextResponse } from "next/server";
import { relancerAlertesEcartOuvertes } from "@/lib/bon-commande/reconciliation";
import { guardCronRequest } from "@/lib/cron-auth";

export async function GET(request: NextRequest) {
    // Garde échec fermé (audit S-8) : exécutée AVANT toute requête DB.
    const refused = guardCronRequest(request, "relance-ecart-bc");
    if (refused) return refused;

    try {
        const { searchParams } = new URL(request.url);
        const delaiHeures = Number(searchParams.get("delaiHeures") ?? 48);

        const relances = await relancerAlertesEcartOuvertes(delaiHeures);

        return NextResponse.json({ relances });
    } catch (error) {
        console.error("[cron/relance-ecarts-bc]", error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}
