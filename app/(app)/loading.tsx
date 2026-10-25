import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";

/**
 * C3 (item 6) — Un SEUL skeleton pour tout le segment `(app)` : la frontière de
 * chargement rend exactement le même composant que `DashboardClient` pendant
 * son chargement de données (`DashboardSkeleton`) — même structure, mêmes
 * dimensions, zéro flash de mise en page entre les deux.
 */
export default function AppLoading() {
  return <DashboardSkeleton />;
}
