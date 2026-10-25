import { NextRequest, NextResponse } from "next/server";

const ER_API_BASE = "https://open.er-api.com/v6/latest";

export async function GET(request: NextRequest, { params }: { params: Promise<{ devise: string }> }) {
    try {
        const { devise } = await params;
        const base = devise.toUpperCase();

        const res = await fetch(`${ER_API_BASE}/${base}`, {
            next: { revalidate: 3600 },
        });

        if (!res.ok) {
            return NextResponse.json(
                { success: false, error: `Erreur API externe: ${res.status}` },
                { status: 502 }
            );
        }

        const data = await res.json();

        return NextResponse.json({
            success: true,
            base: data.base_code,
            rates: data.rates,
            date: data.time_last_update_utc,
        });
    } catch (err) {
        console.error("Taux change fetch error:", err);
        return NextResponse.json(
            { success: false, error: "Impossible de récupérer les taux de change" },
            { status: 502 }
        );
    }
}
