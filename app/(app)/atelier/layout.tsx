/**
 * Layout du sous-arbre `atelier`. Le chrome (sidebar applicative + `Header`)
 * est porté une seule fois par le socle `AppShell` (`app/(app)/layout.tsx`) :
 * ce layout ne fournit que la zone défilante dédiée à l'atelier.
 *
 * NB : le composant s'appelait `ParametresLayout` (copier-coller du layout
 * voisin) — renommé pour lever l'ambiguïté.
 */
export default function AtelierLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <main className="flex-1 overflow-y-auto">{children}</main>;
}
