import { PageBanner } from "@/components/shared/page-banner";
import { FacturationSettingsClient } from "@/components/parametres/facturation-settings-client";

export default function FacturationSettingsPage() {
    return (
    <>
        <PageBanner title="Facturation" />
        <FacturationSettingsClient />
    </>
    );
}
