import { NextResponse } from "next/server";
import { apiRoute } from "@/lib/api-route";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/schemas";
import { unlink } from "fs/promises";
import path from "path";

export const DELETE = apiRoute.delete(
    { permission: "produits:modifier" },
    async (_request, { params }) => {
        const { ficheId } = params;

        const fiche = await prisma.ficheTechnique.findUnique({ where: { id: ficheId } });
        if (!fiche) return NextResponse.json(errorResponse("Fiche introuvable"), { status: 404 });

        const filePath = path.join(process.cwd(), "public", fiche.url);
        try { await unlink(filePath); } catch (err) { console.error("[fiches] suppression du fichier de la fiche impossible", err); }

        await prisma.ficheTechnique.delete({ where: { id: ficheId } });

        return NextResponse.json({ success: true });
    }
);
