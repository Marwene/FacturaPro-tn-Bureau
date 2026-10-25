import { PageBanner } from "@/components/shared/page-banner";
import { ProfilSettingsClient } from "@/components/parametres/profil-settings-client";

export default function ProfilPage() {
    return (
    <>
        <PageBanner title="Mon Profil" />
        <ProfilSettingsClient />
    </>
    );
}
