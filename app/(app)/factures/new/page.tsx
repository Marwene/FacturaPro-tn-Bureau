import { PageBanner } from "@/components/shared/page-banner";
import { NouvelleFactureClient } from "@/components/factures/nouvelle-facture-client";
import { NouvelleFactureActions } from "@/components/factures/nouvelle-facture-actions";

export default function NouvelleFacturePage() {
  return (
    <>
      <PageBanner title="Nouvelle Facture" actions={<NouvelleFactureActions />} />
      <NouvelleFactureClient />
    </>
  );
}
