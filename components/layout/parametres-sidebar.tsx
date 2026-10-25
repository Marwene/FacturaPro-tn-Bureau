"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import {
    Building2,
    User,
    Shield,
    Settings,
    Users,
    Receipt,
    ArrowLeft,
    Barcode,
    Landmark,
    Boxes,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface NavGroup {
    label: string;
    items: NavItem[];
}

interface NavItem {
    label: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    adminOnly?: boolean;
    children?: NavItem[]
}

const navigation: NavGroup[] = [
    {
        label: "ENTREPRISES",
        items: [
            { label: "Liste des entreprises", href: "/parametres/entreprises", icon: Building2 },
        ],
    },
    {
        label: "MON COMPTE",
        items: [
            { label: "Mon profil", href: "/parametres/profil", icon: User },
            { label: "Sécurité", href: "/parametres/securite", icon: Shield },
        ],
    },
    {
        label: "APPLICATION",
        items: [
            { label: "Général", href: "/parametres/app/general", icon: Settings },
            { label: "Utilisateurs", href: "/parametres/app/utilisateurs", icon: Users, adminOnly: true },
            {
                label: "Facturation",
                href: "/parametres/app/facturation",
                icon: Receipt, adminOnly: true,
                children: [
                    { label: "TVA", href: "/parametres/app/facturation/tva", icon: Receipt },
                    { label: "Retenue à la source", href: "/parametres/app/facturation/retenue-a-la-source", icon: Receipt },
                ]
            },
            { label: "Codes NGP", href: "/parametres/app/ngp", icon: Barcode },
            { label: "Colisage", href: "/parametres/app/colisage", icon: Boxes },
        ],
    },
];

export function ParametresSidebar() {
    const pathname = usePathname();
    const { data: session } = useSession();
    const userRole = (session?.user as { role?: string })?.role;

    return (
        <nav className="w-56 shrink-0 border-r border-border bg-card h-full overflow-y-auto">
            <div className="p-3">
                <Link
                    href="/"
                    className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Retour au tableau de bord
                </Link>
            </div>

            <Separator />

            <div className="p-3 space-y-5">
                {navigation.map((group) => {
                    const isRestricted = group.label === "ENTREPRISES";
                    const visibleItems = group.items.filter(
                        (item) => !item.adminOnly || userRole === "ADMIN"
                    );
                    if (visibleItems.length === 0) return null;
                    if (isRestricted && userRole !== "ADMIN") return null;

                    return (
                        <div key={group.label}>
                            <p className="text-[10px] font-semibold text-muted-foreground tracking-wider mb-1.5 px-2">
                                {group.label}
                            </p>
                            <div className="space-y-0.5">
                                {visibleItems.map((item) => {
                                    if (item.children) {
                                        return (
                                            <div key={item.href}>
                                                <Link
                                                    href={item.href}
                                                    className={cn(
                                                        "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                                                        pathname === item.href
                                                            ? "bg-muted text-foreground font-medium"
                                                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                                    )}
                                                >
                                                    <item.icon className="h-4 w-4 shrink-0" />
                                                    {item.label}
                                                </Link>
                                                {pathname.startsWith(item.href) && (
                                                    <div className="pl-6 space-y-0.5 mt-1">
                                                        {item.children.map((child) => {
                                                            const isChildActive = pathname === child.href;
                                                            return (
                                                                <Link
                                                                    key={child.href}
                                                                    href={child.href}
                                                                    className={cn(
                                                                        "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                                                                        isChildActive
                                                                            ? "bg-muted text-foreground font-medium"
                                                                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                                                    )}
                                                                >
                                                                    <child.icon className="h-4 w-4 shrink-0" />
                                                                    {child.label}
                                                                </Link>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    }
                                    const isActive = pathname === item.href;
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            className={cn(
                                                "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                                                isActive
                                                    ? "bg-muted text-foreground font-medium"
                                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                            )}
                                        >
                                            <item.icon className="h-4 w-4 shrink-0" />
                                            {item.label}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </nav>
    );
}
