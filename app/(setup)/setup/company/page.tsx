import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { CompanySetupForm } from "@/components/setup/company-setup-form";

export default async function SetupCompanyPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  // Société déjà configurée → on entre dans l'application
  if (session.user.companyId) redirect("/");

  return (
    <CompanySetupForm
      ownerName={session.user.name ?? ""}
      ownerEmail={session.user.email ?? ""}
    />
  );
}
