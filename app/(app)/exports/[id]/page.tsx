import { ExportDetailClient } from "@/components/exports/export-detail-client";

export default async function ExportDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    return (
        <ExportDetailClient id={id} />
    );
}
