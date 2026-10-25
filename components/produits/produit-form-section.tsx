import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

interface ProduitFormSectionProps {
    icon: LucideIcon;
    title: string;
    description?: ReactNode;
    children: ReactNode;
}

export function ProduitFormSection({ icon: Icon, title, description, children }: ProduitFormSectionProps) {
    return (
        <div>
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <Icon className="size-4 text-muted-foreground" />
                {title}
            </h2>
            {description ? <p className="text-xs text-muted-foreground mb-4">{description}</p> : null}
            {children}
        </div>
    );
}
