import { PageBanner } from "@/components/shared/page-banner";
import { UtilisateursSettingsClient } from "@/components/parametres/utilisateurs-settings-client";

export default function UtilisateursPage() {
    return (
    <>
        <PageBanner title="Utilisateurs" />
        <UtilisateursSettingsClient />
    </>
    );
}
