import { PageBanner } from "@/components/shared/page-banner";
import { ClientsClient } from "@/components/clients/clients-client";
import { NouveauClientDialog } from "@/components/clients/nouveau-client-dialog";

export default function ClientsPage() {
  return (
    <>
      <PageBanner title="Clients" actions={<NouveauClientDialog />} />
      <ClientsClient />
    </>
  );
}
