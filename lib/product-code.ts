import { prisma } from "@/lib/prisma";

export function nameToSkuPrefix(nom: string): string {
    const words = nom.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return "PROD";
    if (words.length === 1) return words[0].substring(0, 3).toUpperCase();
    return words.slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

export async function generateProductCode(nom?: string): Promise<string> {
    const prefix = nom ? nameToSkuPrefix(nom) : "PROD";

    const lastProduct = await prisma.product.findFirst({
        where: { code: { startsWith: prefix } },
        orderBy: { code: "desc" },
        select: { code: true },
    });

    const lastNum = lastProduct?.code
        ? parseInt(lastProduct.code.replace(/[^0-9]/g, ""), 10) || 0
        : 0;

    const nextNum = lastNum + 1;
    return `${prefix}-${String(nextNum).padStart(4, "0")}`;
}
