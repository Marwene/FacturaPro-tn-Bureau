import { NextResponse } from "next/server";
import { apiRoute } from "@/lib/api-route";
import { checkClientBlocage } from "@/lib/check-client-blocage";

export const POST = apiRoute.post(
    { permission: "clients:voir" },
    async (request, { params }) => {
        const { id } = params;
        const result = await checkClientBlocage(id);

        return NextResponse.json({
            ...result,
            message: result.estBloque
                ? "Client bloqué — limite de crédit dépassée."
                : "Client non bloqué.",
        });
    }
);
