import { PageBanner } from "@/components/shared/page-banner";
import { NouveauBLClient } from "@/components/bons-livraison/nouveau-bl-client";
import { NouveauBLActions } from "@/components/bons-livraison/nouveau-bl-actions";

export default function NouveauBLPage() {
  return (
    <>
      <PageBanner title="Nouveau BL" actions={<NouveauBLActions />} />
      <NouveauBLClient />
    </>
  );
}
