import { PageBanner } from "@/components/shared/page-banner";
import { NouvelEffetActions } from "@/components/effets/nouvel-effet-actions";
import { NouvelEffetClient } from "@/components/effets/nouvel-effet-client";

export default function NouvelEffetPage() {
    return (
        <>
            <PageBanner title="Nouvel Effet" actions={<NouvelEffetActions />} />
            <NouvelEffetClient />
        </>
    );
}
