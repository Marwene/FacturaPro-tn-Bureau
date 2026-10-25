import { NextResponse } from "next/server";
import { getTMM, refreshTMM } from "@/lib/tmm-bct";

export async function GET() {
    try {
        const result = await getTMM();
        return NextResponse.json({ success: true, ...result });
    } catch (err) {
        console.error("TMM fetch error:", err);
        return NextResponse.json({ success: false, error: "Impossible de récupérer le TMM" }, { status: 502 });
    }
}

export async function POST() {
    try {
        const result = await refreshTMM();
        return NextResponse.json({ success: true, ...result });
    } catch (err) {
        console.error("TMM refresh error:", err);
        return NextResponse.json({ success: false, error: "Impossible de rafraîchir le TMM" }, { status: 502 });
    }
}