import { FactureDetailClient } from "@/components/factures/facture-detail-client";

export default async function FactureDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    return (
        <FactureDetailClient id={id} />
    );
}