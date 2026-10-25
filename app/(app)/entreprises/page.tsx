import { PageBanner } from "@/components/shared/page-banner";
import { EntreprisesListClient } from "@/components/entreprises/entreprises-list-client";

export default function EntreprisesPage() {
  return (
    <>
        <PageBanner title="Entreprises" />
        <EntreprisesListClient />
    </>
    );
}
