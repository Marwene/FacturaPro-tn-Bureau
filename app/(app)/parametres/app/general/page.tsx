import { PageBanner } from "@/components/shared/page-banner";
import { GeneralSettingsClient } from "@/components/parametres/general-settings-client";

export default function GeneralSettingsPage() {
    return (
    <>
        <PageBanner title="Général" />
        <GeneralSettingsClient />
    </>
    );
}
