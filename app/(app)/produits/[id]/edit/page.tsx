import { prisma } from "@/lib/prisma";
import { serializeDecimals } from "@/lib/decimal";
import { ProduitFormPage } from "@/components/produits/produit-form-page";
import { notFound } from "next/navigation";

export default async function EditProduitPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const product = await prisma.product.findUnique({
        where: { id },
        include: { variants: { orderBy: { ordre: "asc" } } },
    });

    if (!product) notFound();

    const serialized = {
        ...serializeDecimals(product),
        variants: product.variants.map((v) => ({
            ...serializeDecimals(v),
            attributs: v.attributs as Record<string, string> | null,
        })),
    };

    return (
        <ProduitFormPage product={serialized} />
    );
}
