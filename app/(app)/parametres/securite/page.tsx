import { PageBanner } from "@/components/shared/page-banner";
import { SecuriteSettingsClient } from "@/components/parametres/securite-settings-client";

export default function SecuritePage() {
    return (
    <>
        <PageBanner title="Sécurité" />
        <SecuriteSettingsClient />
    </>
    );
}
