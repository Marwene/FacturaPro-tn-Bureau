import { prisma } from "@/lib/prisma";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Sidebar } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * C2 (item 8) — données de la sidebar sorties du chemin critique de rendu de
 * `app/(app)/layout.tsx`. Composant serveur async enveloppé dans `<Suspense>`
 * côté layout : les 3 `count()` (factures, chèques, alertes stock) se résolvent
 * en streaming au lieu de bloquer l'affichage du layout entier.
 * Aucun changement visuel : même `<AppSidebar>` avec les mêmes props, une fois
 * résolu.
 */
async function getSidebarData(companyId: string) {
  const [invoiceCount, chequeCount, stockAlerts] = await Promise.all([
    prisma.invoice.count({ where: { companyId, status: { in: ["BROUILLON", "ENVOYEE"] } } }),
    prisma.cheque.count({ where: { companyId, status: "EN_ATTENTE" } }),
    prisma.product.count({ where: { stockStatus: { in: ["CRITIQUE", "RUPTURE"] } } }),
  ]);
  return { invoiceCount, chequeCount, stockAlerts };
}

export async function AppSidebarWithData({ companyId }: { companyId: string }) {
  const { invoiceCount, chequeCount, stockAlerts } = await getSidebarData(companyId);

  return (
    <AppSidebar
      invoiceCount={invoiceCount}
      chequeCount={chequeCount}
      stockAlerts={stockAlerts}
    />
  );
}

/**
 * Fallback `<Suspense>` : coque de sidebar aux dimensions exactes (même
 * `<Sidebar variant="inset" collapsible="icon">` que le composant réel, donc
 * même empreinte de mise en page) avec des squelettes pulsants. Visible le temps
 * de la résolution des counts uniquement.
 */
export function AppSidebarFallback() {
  return (
    <Sidebar variant="inset" collapsible="icon" className="sidebar-no-bg" aria-hidden>
      <div className="flex flex-col gap-3 p-2 pt-4">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </Sidebar>
  );
}
