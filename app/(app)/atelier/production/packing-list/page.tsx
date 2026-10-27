import { PageBanner } from "@/components/shared/page-banner";
import { PackingListClient } from "@/components/atelier/packing-list-client";

export default function PackingListPage() {
    return (
        <>
            <PageBanner title="Packing List" />
            <PackingListClient />
        </>
    )
}
