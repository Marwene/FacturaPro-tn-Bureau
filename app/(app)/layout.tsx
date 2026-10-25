import { AppShell } from "@/components/shared/app-shell";

/**
 * Layout du groupe `(app)` — tout le chrome (auth, sidebar, header, palette de
 * commandes) est porté par le socle partagé `AppShell`. Ce fichier ne fait que
 * l'instantier pour le sous-arbre applicatif.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
