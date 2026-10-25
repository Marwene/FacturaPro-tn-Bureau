import { PageBanner } from "@/components/shared/page-banner";

import { RASettingsManager } from "@/components/parametres/param-ras-manager";

export default function RASettingsPage() {
    return (
        <>
            <PageBanner title="Retenue à la Source" />
            <div className="p-4 w-full space-y-4">
                <RASettingsManager />
            </div>
        </>
    )
}
