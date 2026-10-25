import { prisma } from "@/lib/prisma";
import { ServiceError } from "@/lib/service-error";
import { bonCommandeSchema } from "@/lib/schemas/bon-commande";
import { nextNumber } from "@/lib/sequence";
import { generateProductQRData } from "@/lib/qr-data";
import Big from "big.js";
import { StockStatus } from "@/prisma/generated/prisma/client";

/**
 * Création d'un bon de commande — service partagé (lot H) entre
 * `POST /api/bons-commande` et `createBonCommandeFromExtraction`
 * (`app/actions/bons-commande.ts`) : plus de `fetch()` ni de logique dupliquée.
 * Les erreurs métier sont levées en `ServiceError` (statut + corps identiques à
 * l'ancienne réponse de route).
 */
// Pas d'annotation de retour : le type est déduit de `prisma.bonCommande.create`
// (lot H) pour que les consommateurs (`scan-bon-commande-client.tsx` lit
// `result.data.numero` / `result.data.id`) restent typés sans `any`.
export async function createBonCommande(
    rawBody: unknown,
    companyId: string
) {
    const parsed = bonCommandeSchema.safeParse(rawBody);
    if (!parsed.success) {
        throw ServiceError.response(400, "Données invalides", parsed.error.issues);
    }

    const data = parsed.data;

    let tiersId: string = data.tiersId ?? "";
    let tiersExonereTVA = false;
    let createClientInTx = false;

    if (data.tiersId) {
        const tiers = await prisma.tiers.findUnique({
            where: { id: data.tiersId },
            select: { exonereTVA: true },
        });
        if (!tiers) throw ServiceError.response(404, "Client introuvable");

        try {
            const { assertClientNonBloque } = await import("@/lib/check-client-blocage");
            await assertClientNonBloque(data.tiersId);
        } catch (e) {
            throw ServiceError.response(403, (e as Error).message);
        }

        tiersExonereTVA = tiers.exonereTVA;
    } else if (data.createClient && data.client?.raisonSociale) {
        const c = data.client;
        const existing = c.matriculeFiscal
            ? await prisma.tiers.findUnique({
                where: { matriculeFiscal: c.matriculeFiscal },
                select: { id: true, exonereTVA: true },
            })
            : await prisma.tiers.findFirst({
                where: { raisonSociale: { equals: c.raisonSociale, mode: "insensitive" }, isClient: true },
                select: { id: true, exonereTVA: true },
            });

        if (existing) {
            tiersId = existing.id;
            tiersExonereTVA = existing.exonereTVA;
        } else {
            createClientInTx = true;
        }
    } else {
        throw ServiceError.response(400, "Client requis");
    }

    const numero = await getNextNumero(companyId);

    const doc = await prisma.$transaction(async (tx) => {
        let resolvedTiersId = tiersId;
        let resolvedExonereTVA = tiersExonereTVA;

        if (createClientInTx && data.client?.raisonSociale) {
            const c = data.client;
            try {
                const created = await tx.tiers.create({
                    data: {
                        code: await nextNumber("client", "C-", companyId),
                        raisonSociale: c.raisonSociale,
                        matriculeFiscal: c.matriculeFiscal ?? null,
                        adresse: c.adresse ?? null,
                        ville: c.ville ?? null,
                        telephone: c.telephone ?? null,
                        email: c.email ?? null,
                        isClient: true,
                        isFournisseur: false,
                    },
                });
                resolvedTiersId = created.id;
            } catch (error: unknown) {
                if ((error as { code?: string }).code === "P2002" && c.matriculeFiscal) {
                    const duplicate = await tx.tiers.findUnique({
                        where: { matriculeFiscal: c.matriculeFiscal },
                        select: { id: true, exonereTVA: true },
                    });
                    if (duplicate) {
                        resolvedTiersId = duplicate.id;
                        resolvedExonereTVA = duplicate.exonereTVA;
                    } else {
                        throw error;
                    }
                } else {
                    throw error;
                }
            }
        }

        let baseHT = new Big(0);
        let totalHT = new Big(0);
        let totalTVA = new Big(0);
        let totalFodec = new Big(0);

        const lines: {
            productId: string | null;
            description: string;
            quantite: string;
            prixHT: string;
            remise: string;
            tauxTVA: string;
            fodec: boolean;
            tauxFodec: string;
            totalHT: string;
            ordre: number;
            typeSource: "PRODUCTION" | "STOCK";
        }[] = [];

        for (const [i, line] of data.lines.entries()) {
            let productId = line.productId ?? null;

            if (!productId && line.createProduct && line.description) {
                const product = await tx.product.create({
                    data: {
                        code: await nextNumber("produit", "P-", companyId),
                        nom: line.description,
                        description: line.description,
                        prixHT: line.prixHT.toString(),
                        prixAchat: "0",
                        tauxTVA: line.tauxTVA.toString(),
                        tiersId: resolvedTiersId,
                        unite: "Pièce",
                        stockActuel: "0",
                        stockMinimum: "0",
                        stockStatus: "RUPTURE" as StockStatus,
                        actif: true,
                    },
                });

                await tx.product.update({
                    where: { id: product.id },
                    data: {
                        codeBarre: generateProductQRData({
                            id: product.id,
                            code: product.code,
                            nom: product.nom,
                            description: product.description,
                            categorie: null,
                            prixHT: product.prixHT.toString(),
                            tauxTVA: product.tauxTVA.toString(),
                            stockActuel: "0",
                            unite: "Pièce",
                        }),
                    },
                });

                productId = product.id;
            }

            const remise = new Big(line.remise);
            const tauxTVA = resolvedExonereTVA ? new Big(0) : new Big(line.tauxTVA);
            const qte = new Big(line.quantite);
            const prix = new Big(line.prixHT);
            const fodec = line.fodec === true;
            const tauxFodec = fodec ? new Big(line.tauxFodec) : new Big(0);

            const remiseMontant = prix.times(remise.div(100));
            const htLigne = prix.minus(remiseMontant).times(qte);
            const tvaLigne = htLigne.times(tauxTVA.div(100));
            const fodecLigne = fodec ? htLigne.times(tauxFodec.div(100)) : new Big(0);

            baseHT = baseHT.plus(prix.times(qte));
            totalHT = totalHT.plus(htLigne);
            totalTVA = totalTVA.plus(tvaLigne);
            totalFodec = totalFodec.plus(fodecLigne);

            lines.push({
                productId,
                description: line.description,
                quantite: qte.toFixed(3),
                prixHT: prix.toFixed(4),
                remise: remise.toFixed(2),
                tauxTVA: tauxTVA.toFixed(2),
                fodec,
                tauxFodec: tauxFodec.toFixed(2),
                totalHT: htLigne.toFixed(4),
                ordre: i,
                typeSource: line.typeSource ?? "STOCK",
            });
        }

        const finalBaseHT = baseHT;
        const finalHT = data.totalHT != null ? new Big(data.totalHT) : totalHT;
        const finalTVA = data.totalTVA != null ? new Big(data.totalTVA) : totalTVA;
        const finalTTC = data.totalTTC != null
            ? new Big(data.totalTTC)
            : new Big(totalHT).plus(new Big(totalTVA)).plus(new Big(totalFodec));
        const finalFodec = data.totalTTC != null ? new Big(0) : totalFodec;

        return tx.bonCommande.create({
            data: {
                numero,
                tiersId: resolvedTiersId,
                companyId,
                dateCreation: new Date(data.dateCreation),
                dateExpiration: data.dateExpiration ? new Date(data.dateExpiration) : null,
                referenceClient: data.referenceClient ?? null,
                baseHT: finalBaseHT.toFixed(4),
                totalHT: finalHT.toFixed(4),
                totalTVA: finalTVA.toFixed(4),
                totalFodec: finalFodec.toFixed(4),
                totalTTC: finalTTC.toFixed(4),
                status: "BROUILLON",
                notes: data.notes ?? null,
                lines: { create: lines },
            },
            include: {
                tiers: { select: { id: true, raisonSociale: true } },
                lines: { include: { product: { select: { id: true, nom: true, code: true } } } },
            },
        });
    });

    return { data: doc };
}

async function getNextNumero(companyId: string) {
    const last = await prisma.bonCommande.findFirst({
        where: { companyId },
        orderBy: { createdAt: "desc" },
        select: { numero: true },
    });

    const company = await prisma.company.findUnique({ where: { id: companyId }, select: { prefixeBC: true } });
    const prefix = company?.prefixeBC ?? "BC";

    let nextNum = 1;
    if (last?.numero) {
        const match = last.numero.match(/(\d+)$/);
        if (match) nextNum = parseInt(match[1], 10) + 1;
    }

    const year = new Date().getFullYear();
    return `${prefix}-${year}-${String(nextNum).padStart(4, "0")}`;
}
