"use client";

import { usePathname } from "next/navigation";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { routeLabels } from "@/lib/route-labels";

const ID_REGEX = /^[a-z0-9]{20,}$/;
const NEW_SEGMENTS = new Set(["new", "nouveau", "nouvelle"]);

function segmentLabel(segment: string): string {
    return segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ");
}

export function AutoBreadcrumb() {
    const pathname = usePathname();
    const segments = pathname.split("/").filter(Boolean);

    if (segments.length === 0) {
        return (
            <Breadcrumb className="hidden sm:block">
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbPage className="font-semibold">Tableau de Bord</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>
        );
    }

    const items: { label: string; href?: string }[] = [];
    let accumulated = "";

    for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        accumulated += "/" + seg;

        const isLast = i === segments.length - 1;
        const isId = ID_REGEX.test(seg);
        const isNew = NEW_SEGMENTS.has(seg.toLowerCase());

        // Try to find route config for this accumulation
        const config = routeLabels[accumulated];

        if (isLast && isId) {
            // Detail page: use parent label for "Détail ..."
            const parentPath = accumulated.slice(0, accumulated.lastIndexOf("/")) || "/";
            const parentConfig = routeLabels[parentPath];
            const detailLabel = parentConfig
                ? `Détail ${parentConfig.label.replace(/s$/, "")}`
                : "Détail";
            items.push({ label: detailLabel });
        } else if (isLast && isNew) {
            // Create page
            const parentPath = "/" + segments.slice(0, -1).join("/");
            const parentConfig = routeLabels[parentPath];
            items.push({
                label: parentConfig?.labelNew ?? `Nouveau ${parentConfig?.label ?? segmentLabel(seg)}`,
            });
        } else if (config) {
            items.push(isLast ? { label: config.label } : { label: config.label, href: accumulated });
        } else {
            // Unknown segment — just capitalize and fallback
            items.push(isLast ? { label: segmentLabel(seg) } : { label: segmentLabel(seg), href: accumulated });
        }
    }

    return (
        <Breadcrumb className="hidden sm:block">
            <BreadcrumbList>
                <BreadcrumbItem>
                    <BreadcrumbLink href="/">Accueil</BreadcrumbLink>
                </BreadcrumbItem>
                {items.map((crumb, i) => (
                    <span key={i} className="contents">
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            {crumb.href ? (
                                <BreadcrumbLink href={crumb.href} className="truncate max-w-[120px]">
                                    {crumb.label}
                                </BreadcrumbLink>
                            ) : (
                                <BreadcrumbPage className="font-semibold truncate max-w-[160px]">
                                    {crumb.label}
                                </BreadcrumbPage>
                            )}
                        </BreadcrumbItem>
                    </span>
                ))}
            </BreadcrumbList>
        </Breadcrumb>
    );
}
