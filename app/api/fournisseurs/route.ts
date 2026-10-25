import { apiRoute } from "@/lib/api-route";
import { fournisseurSchema } from "@/lib/schemas/fournisseur";
import { prisma } from "@/lib/prisma";
import { serializeDecimals } from "@/lib/decimal";

export const GET = apiRoute.get(
    { permission: "fournisseurs:voir", requireCompany: true },
    async (request, { companyId: _companyId }) => {
        const search = new URL(request.url).searchParams.get("search") ?? "";

        const fournisseurs = await prisma.tiers.findMany({
            where: {
                isFournisseur: true,
                ...(search
                    ? {
                        OR: [
                            { raisonSociale: { contains: search, mode: "insensitive" } },
                            { matriculeFiscal: { contains: search, mode: "insensitive" } },
                            { ville: { contains: search, mode: "insensitive" } },
                            { code: { contains: search, mode: "insensitive" } },
                            { contactNom: { contains: search, mode: "insensitive" } },
                        ],
                    }
                    : {}),
            },
            orderBy: { raisonSociale: "asc" },
        });

        const totalActifs = fournisseurs.filter((f) => f.actif).length;
        const avecContact = fournisseurs.filter((f) => f.contactNom).length;

        return {
            fournisseurs: serializeDecimals(fournisseurs),
            stats: {
                total: fournisseurs.length,
                actifs: totalActifs,
                inactifs: fournisseurs.length - totalActifs,
                avecContact,
            },
        };
    }
);

export const POST = apiRoute.post(
    { permission: "fournisseurs:creer", requireCompany: true },
    async (request, { companyId: _companyId }) => {
        const body = await request.json();
        const parsed = fournisseurSchema.safeParse(body);

        if (!parsed.success) {
            throw new Error("Données invalides: " + parsed.error.issues.map((i) => i.message).join(", "));
        }

        try {
            const fournisseur = await prisma.tiers.create({
                data: {
                    ...parsed.data,
                    isClient: false,
                    isFournisseur: true,
                },
            });

            return { fournisseur: serializeDecimals(fournisseur) };
        } catch (error: unknown) {
            if ((error as { code?: string }).code === "P2002") {
                throw Object.assign(new Error("Code ou matricule fiscal déjà utilisé"), { status: 409 });
            }
            throw error;
        }
    }
);
