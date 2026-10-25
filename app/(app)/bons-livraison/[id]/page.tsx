import { BLDetailClient } from "@/components/bons-livraison/bl-detail-client";

export default async function BLDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    return (
        <BLDetailClient id={id} />
    );
}