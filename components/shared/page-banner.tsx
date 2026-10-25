import { cn } from "@/lib/utils"
import { PageHeader } from "./page-header"

interface PageBannerProps {
    title: string
    description?: string
    actions?: React.ReactNode
    className?: string
}

/**
 * Bandeau d'en-tête de **contenu** — le haut de chaque page applicative.
 *
 * Composition de `PageHeader` (primitif de titre) dans un conteneur de mise en
 * page : le `PageHeader` nu reste utilisable comme titre inline (rangées de
 * détail : `<PageHeader title={numero} className="min-w-0" />`), là où ce
 * composant porte le bandeau complet en tête de page.
 *
 * Contrat de placement (lot AppShell) : rendu **en frère** avant le composant
 * scrollable de la page, dans la colonne `flex flex-col overflow-hidden` fournie
 * par `PageTransition`. D'où `shrink-0` (le bandeau ne se comprime jamais
 * quand le contenu défile) et le padding aligné sur les conteneurs de contenu
 * du projet (`p-3 md:p-4`). Aucun `className` nécessaire côté page : la
 * convention est ici, une seule fois.
 *
 * Marge basse volontairement absente : les pages séparent déjà le bandeau de
 * leur contenu via le `space-y-*` de leur conteneur, ou via leur propre rythme
 * vertical (écrans détail).
 */
export function PageBanner({ title, description, actions, className }: PageBannerProps) {
    return (
        <div className={cn("shrink-0 px-3 pt-3 md:px-4 md:pt-4", className)}>
            <PageHeader title={title} description={description} actions={actions} />
        </div>
    )
}
