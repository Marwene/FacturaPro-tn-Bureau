import { NextResponse } from "next/server";
import { apiRoute } from "@/lib/api-route";
import { tiersSchema, errorResponse } from "@/lib/schemas";
import { prisma } from "@/lib/prisma";
import { serializeDecimals } from "@/lib/decimal";
import Big from "big.js";

export const GET = apiRoute.get({ permission: "clients:voir" }, async (request) => {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? "";

  const clients = await prisma.tiers.findMany({
    where: {
      isClient: true,
      ...(search
        ? {
          OR: [
            { raisonSociale: { contains: search, mode: "insensitive" } },
            { matriculeFiscal: { contains: search, mode: "insensitive" } },
            { ville: { contains: search, mode: "insensitive" } },
            { code: { contains: search, mode: "insensitive" } },
          ],
        }
        : {}),
    },
    orderBy: { raisonSociale: "asc" },
  });

  // Compute solde (creances) per client
  const invoiceSums = await prisma.invoice.groupBy({
    by: ["tiersId"],
    where: { status: { notIn: ["BROUILLON", "ANNULEE", "PAYEE"] } },
    _sum: { resteAPayer: true },
  });

  const soldeMap = new Map(
    invoiceSums.map((s) => [
      s.tiersId,
      s._sum.resteAPayer?.toString() ?? "0",
    ])
  );

  const clientsWithSolde = clients.map((c) => ({
    ...c,
    solde: soldeMap.get(c.id) ?? "0",
  }));

  // Stats
  const totalSolde = Array.from(soldeMap.values()).reduce(
    (acc, v) => acc.plus(new Big(v)),
    new Big(0)
  );

  const stats = {
    totalClients: clients.length,
    totalSolde: totalSolde.toFixed(3),
    clientsTVA: clients.filter((c) => c.assujettTVA).length,
    avecRetenue: clients.filter(
      (c) => parseFloat(c.tauxRetenue.toString()) > 0
    ).length,
  };

  return {
    clients: serializeDecimals(clientsWithSolde),
    stats,
  };
});

export const POST = apiRoute.post({ permission: "clients:creer" }, async (request) => {
  try {
    const body = await request.json();
    const parsed = tiersSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        errorResponse("Données invalides", parsed.error.issues),
        { status: 400 }
      );
    }

    const client = await prisma.tiers.create({
      data: {
        ...parsed.data,
        isClient: true,
        isFournisseur: false,
        tauxRetenue: parsed.data.tauxRetenue.toString(),
      },
    });

    return NextResponse.json(
      { client: serializeDecimals(client) },
      { status: 201 }
    );
  } catch (error: unknown) {
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json(
        errorResponse("Code ou matricule fiscal déjà utilisé"),
        { status: 409 }
      );
    }
    console.error("[clients/POST]", error);
    return NextResponse.json(errorResponse("Erreur serveur"), { status: 500 });
  }
});
