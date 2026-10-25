import { FournisseurDetailClient } from "@/components/fournisseurs/fournisseur-detail-client";

export default async function FournisseurDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    return (
        <FournisseurDetailClient fournisseurId={id} />
    );
}