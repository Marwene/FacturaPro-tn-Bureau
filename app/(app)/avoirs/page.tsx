import { PageBanner } from "@/components/shared/page-banner";

import { AvoirsClient } from "@/components/avoirs/avoirs-client";
import { NouveauAvoirDialog } from "@/components/avoirs/avoir-dialog";

export default function AvoirsPage() {
    return (
        <>
            <PageBanner title="Avoirs" actions={<NouveauAvoirDialog />} />
            <AvoirsClient />
        </>
    );
}
