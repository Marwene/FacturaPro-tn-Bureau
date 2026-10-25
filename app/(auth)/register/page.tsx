import { redirect } from "next/navigation";
import { hasAdmin } from "@/lib/bootstrap";
import { RegisterForm } from "@/components/auth/register-form";

export default async function RegisterPage() {
  const adminExists = await hasAdmin();
  if (adminExists) redirect("/login");

  return <RegisterForm />;
}