import { PageBanner } from "@/components/shared/page-banner";
import { use } from "react";
import { EntrepriseBanquesClient } from "@/components/entreprises/entreprise-banques-client";

export default function BanquesPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    return (
    <>
        <PageBanner title="Banques" />
        <EntrepriseBanquesClient companyId={id} />
    </>
    );
}
