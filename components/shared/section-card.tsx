import { cn } from "@/lib/utils"
import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardHeader,
} from "@/components/ui/card"

interface SectionCardProps {
    title?: string
    description?: string
    actions?: React.ReactNode
    children: React.ReactNode
    headingLevel?: "h2" | "h3"
    className?: string
    contentClassName?: string
}

/**
 * Carte de section pour les pages de détail : titre sémantique (h2/h3),
 * description optionnelle, slot d'actions dans le header. Utiliser un
 * `SectionCard` par bloc logique — pas une carte générique pour chaque bloc
 * de contenu (voir DESIGN.md : la sobriété est une feature).
 */
export function SectionCard({
    title,
    description,
    actions,
    children,
    headingLevel: Heading = "h2",
    className,
    contentClassName,
}: SectionCardProps) {
    return (
        <Card className={className}>
            {(title || description || actions) && (
                <CardHeader>
                    {title && (
                        <Heading className="font-heading text-base leading-snug font-medium">
                            {title}
                        </Heading>
                    )}
                    {description && <CardDescription>{description}</CardDescription>}
                    {actions && <CardAction>{actions}</CardAction>}
                </CardHeader>
            )}
            <CardContent className={cn(contentClassName)}>{children}</CardContent>
        </Card>
    )
}
