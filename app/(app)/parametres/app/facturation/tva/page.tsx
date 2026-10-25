import { PageBanner } from "@/components/shared/page-banner";

import { TVASettingsManager } from "@/components/parametres/param-tva-manager";

export default function TVASettingsPage() {
    return (
        <>
            <PageBanner title="TVA" />
            <div className="p-4 w-full space-y-4">
                <TVASettingsManager />
            </div>
        </>
    )
}
