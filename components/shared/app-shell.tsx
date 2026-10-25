import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
    AppSidebarFallback,
    AppSidebarWithData,
} from "@/components/layout/app-sidebar-data";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { Header } from "@/components/layout/header";
import { PageTransition } from "@/components/page-transition";
import { CommandPalette } from "@/components/command-palette";

/**
 * `AppShell` — chrome applicatif **unique** du groupe de routes `(app)`.
 *
 * Assemble, une seule fois pour toutes les pages applicatives :
 * `SidebarProvider` → sidebar de données (streaming sous `<Suspense>`) →
 * `SidebarInset` contenant le `Header` global puis la zone de contenu animée
 * (`PageTransition`) → `CommandPalette`.
 *
 * Pourquoi cette extraction : le `Header` était rendu **par page** (~40
 * duplications, chacune ré-imposant `actions`/`breadcrumbs`), tandis que les
 * sous-layouts `atelier` et `parametres` en rendaient un second → header
 * tantôt doublé, tantôt absent (6 pages de `(app)` n'en avaient aucun).
 * Désormais la barre haute porte le socle invariable (déclencheur de sidebar,
 * fil d'Ariane auto, switcher de société, notifications, thème) et chaque page
 * porte son bandeau d'en-tête de contenu (titre + action principale) via
 * `components/shared/page-banner.tsx`.
 *
 * Contrat : composant **serveur**. Il porte la garde d'authentification ET la
 * redirection `setup/company` — un layout enfant n'a donc rien à revérifier.
 * La sidebar reste en streaming : ses 3 `count()` ne bloquent pas le rendu
 * (C2 item 8), fallback de mêmes dimensions pendant la résolution.
 */
export async function AppShell({ children }: { children: React.ReactNode }) {
    const session = await auth();
    if (!session?.user?.id) redirect("/login");
    // Pas encore de société associée → l'administrateur doit d'abord configurer sa société
    if (!session.user.companyId) redirect("/setup/company");

    return (
        <SidebarProvider
            style={
                {
                    "--sidebar-width": "calc(var(--spacing) * 72)",
                    "--header-height": "calc(var(--spacing) * 12)",
                } as React.CSSProperties
            }
        >
            <Suspense fallback={<AppSidebarFallback />}>
                <AppSidebarWithData companyId={session.user.companyId} />
            </Suspense>
            <SidebarInset className="flex flex-col overflow-hidden">
                <Header />
                <PageTransition>{children}</PageTransition>
            </SidebarInset>
            <CommandPalette />
        </SidebarProvider>
    );
}
