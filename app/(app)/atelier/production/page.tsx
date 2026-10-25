import { PageBanner } from "@/components/shared/page-banner";

import { OrdresFabricationClient } from "@/components/atelier/ordres-fabrication-client"

export default function ProductionPage() {
  return (
    <>
        <PageBanner title="Production" />
      <OrdresFabricationClient />
    </>
  )
}
