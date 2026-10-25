import { prisma } from "@/lib/prisma";
import Big from "big.js";

export interface BlocageResult {
    estBloque: boolean;
    creditLimit: string;
    soldeImpaye: string;
    tauxUtilisation: number;
}

export async function checkClientBlocage(tiersId: string): Promise<BlocageResult> {
    const tiers = await prisma.tiers.findUnique({
        where: { id: tiersId },
        select: { creditLimit: true, dateBlocage: true },
    });

    if (!tiers) {
        return { estBloque: false, creditLimit: "0", soldeImpaye: "0", tauxUtilisation: 0 };
    }

    const creditLimit = new Big(tiers.creditLimit.toString());
    if (creditLimit.eq(0)) {
        return { estBloque: false, creditLimit: "0", soldeImpaye: "0", tauxUtilisation: 0 };
    }

    const unpaid = await prisma.invoice.aggregate({
        where: {
            tiersId,
            status: { notIn: ["BROUILLON", "ANNULEE", "PAYEE"] },
        },
        _sum: { resteAPayer: true },
    });

    const soldeImpaye = new Big(unpaid._sum.resteAPayer?.toString() ?? "0");
    const estBloque = soldeImpaye.gt(creditLimit);
    const tauxUtilisation = creditLimit.gt(0)
        ? Math.min(soldeImpaye.div(creditLimit).times(100).toNumber(), 999)
        : 0;

    const now = new Date();
    if (estBloque && !tiers.dateBlocage) {
        await prisma.tiers.update({
            where: { id: tiersId },
            data: { dateBlocage: now },
        });
    } else if (!estBloque && tiers.dateBlocage) {
        await prisma.tiers.update({
            where: { id: tiersId },
            data: { dateBlocage: null },
        });
    }

    return {
        estBloque,
        creditLimit: creditLimit.toFixed(3),
        soldeImpaye: soldeImpaye.toFixed(3),
        tauxUtilisation,
    };
}

export async function assertClientNonBloque(tiersId: string): Promise<void> {
    const { estBloque } = await checkClientBlocage(tiersId);
    if (estBloque) {
        throw new Error("Ce client est bloqué pour dépassement de sa limite de crédit.");
    }
}
