import { PageBanner } from "@/components/shared/page-banner";
import { NouveauDevisClient } from "@/components/devis/nouveau-devis-client";
import { NouveauDevisActions } from "@/components/devis/nouveau-devis-actions";

export default function NouveauDevisPage() {
  return (
    <>
      <PageBanner title="Nouveau Devis" actions={<NouveauDevisActions />} />
      <NouveauDevisClient />
    </>
  );
}
