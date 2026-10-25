import { ProduitDetailClient } from "@/components/produits/produit-detail-client";

export default async function ProduitDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    return (
        <ProduitDetailClient productId={id} />
    );
}
