import { NextRequest, NextResponse } from "next/server";
import { searchAll, searchModule } from "@/lib/search";
import { apiRoute } from "@/lib/api-route";

export const GET = apiRoute.get(
    { permission: "search:voir", requireCompany: false },
    async (request, { companyId }) => {
        const q = request.nextUrl.searchParams.get("q") || "";
        const currentModule = request.nextUrl.searchParams.get("module") || "";
        const cid = companyId || null;

        if (!q.trim()) {
            return { groups: [] };
        }

        if (currentModule) {
            const group = await searchModule(q, currentModule, cid);
            return { groups: group ? [group] : [] };
        }

        const groups = await searchAll(q, cid);
        return { groups };
    },
);
