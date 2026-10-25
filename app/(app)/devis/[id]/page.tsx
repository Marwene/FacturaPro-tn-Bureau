import { DevisDetailClient } from "@/components/devis/devis-detail-client";

export default async function DevisDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    return (
        <DevisDetailClient id={id} />
    );
}
