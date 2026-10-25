import { EffetDetailClient } from "@/components/effets/effet-detail-client";

export default async function EffetDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    return (
        <EffetDetailClient id={id} />
    );
}
