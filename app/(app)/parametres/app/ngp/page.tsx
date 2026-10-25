import { PageBanner } from "@/components/shared/page-banner";
import { NgpSettingsClient } from "@/components/parametres/ngp-settings-client";

export default function NgpPage() {
    return (
    <>
        <PageBanner title="NGP" />
        <NgpSettingsClient />
    </>
    );
}
