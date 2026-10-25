import { cn } from "@/lib/utils"

interface PageHeaderProps {
    title: string
    description?: string
    actions?: React.ReactNode
    className?: string
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
    return (
        <div className={cn("flex flex-wrap items-end justify-between gap-x-4 gap-y-2", className)}>
            <div className="min-w-0 space-y-1">
                <h1 className="truncate text-xl font-semibold tracking-tight text-foreground">
                    {title}
                </h1>
                {description && (
                    <p className="text-sm text-pretty text-muted-foreground">{description}</p>
                )}
            </div>
            {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
    )
}
