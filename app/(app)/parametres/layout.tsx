import { ParametresSidebar } from "@/components/layout/parametres-sidebar";

/**
 * Layout du sous-arbre `parametres` : sidebar secondaire + zone défilante.
 *
 * Le chrome (sidebar applicative + `Header`) est porté **une seule fois** par
 * le socle `AppShell` (`app/(app)/layout.tsx`) : le `<Header />` local — qui
 * le doublait depuis que le shell global l'a intégré — et les deux wrappers
 * redondants ont été supprimés. Seule la structure à deux panneaux est
 * conservée, puisqu'elle est propre à ce sous-arbre.
 */
export default function ParametresLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex flex-1 overflow-hidden">
            <ParametresSidebar />
            <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
    );
}
