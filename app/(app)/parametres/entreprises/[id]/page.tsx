import { PageBanner } from "@/components/shared/page-banner";
import { use } from "react";
import { EntrepriseDetailClient } from "@/components/entreprises/entreprise-detail-client";

export default function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    return (
    <>
        <PageBanner title="Entreprise" />
        <EntrepriseDetailClient companyId={id} />
    </>
    );
}
