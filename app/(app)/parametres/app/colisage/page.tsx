import { PageBanner } from "@/components/shared/page-banner";

import { CartonTypesManager } from "@/components/parametres/carton-types-manager"

export default function ColisageSettingsPage() {
  return (
    <>
      <PageBanner title="Colisage" />
      <div className="p-4 w-full space-y-4">
        <CartonTypesManager />
      </div>
    </>
  )
}
