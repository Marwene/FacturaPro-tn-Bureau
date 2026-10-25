import { AchatDetailClient } from "@/components/achats/achat-detail-client";

export default async function AchatDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    return (
        <AchatDetailClient id={id} />
    );
}
