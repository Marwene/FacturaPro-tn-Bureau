import { NextResponse } from "next/server";
import { apiRoute } from "@/lib/api-route";
import { prisma } from "@/lib/prisma";
import { serializeDecimals } from "@/lib/decimal";
import { errorResponse } from "@/lib/schemas";
import { z } from "zod";

const creditLimitSchema = z.object({
    creditLimit: z.coerce.number().min(0, "La limite doit être >= 0"),
});

export const PATCH = apiRoute.patch(
    { permission: "clients:modifier" },
    async (request, { params }) => {
        const { id } = params;
        const body = await request.json();
        const parsed = creditLimitSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(errorResponse("Données invalides", parsed.error.issues), { status: 400 });
        }

        const client = await prisma.tiers.update({
            where: { id },
            data: { creditLimit: parsed.data.creditLimit },
        });

        return NextResponse.json({ client: serializeDecimals(client) });
    }
);
