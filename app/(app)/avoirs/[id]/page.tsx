import { AvoirDetailClient } from "@/components/avoirs/avoir-detail-client";

export default async function AvoirDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    return (
        <AvoirDetailClient id={id} />
    );
}
