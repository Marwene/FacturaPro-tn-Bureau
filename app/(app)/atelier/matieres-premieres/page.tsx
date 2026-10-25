import { PageBanner } from "@/components/shared/page-banner";
import { MatieresPremieresClient } from "@/components/atelier/matieres-premieres-client"

export default function MatieresPremieresPage() {
  return (
    <>
        <PageBanner title="Matières Premières" />
      <MatieresPremieresClient />
    </>
  )
}
