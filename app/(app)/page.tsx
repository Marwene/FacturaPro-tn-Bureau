import { PageBanner } from "@/components/shared/page-banner";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { NouveauDialog } from "@/components/dashboard/nouveau-dialog";

export default function DashboardPage() {
  return (
    <>
      <PageBanner title="Tableau de Bord" actions={<NouveauDialog />} />
      <DashboardClient />
    </>
  );
}
