"use client"

import Link from "next/link"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useLogout } from "@/hooks/use-auth"
import { usePermissions } from "@/lib/use-permissions"
import type { PermissionKey } from "@/lib/permissions"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuBadge,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubItem,
    SidebarMenuSubButton,
    SidebarRail,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

function Logo() {
    return (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
            <rect width="28" height="28" rx="6" className="fill-primary" />
            <text x="14" y="19" textAnchor="middle" className="fill-primary-foreground" fontSize="13" fontWeight="700" fontFamily="DM Sans, sans-serif">FP</text>
        </svg>
    )
}
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    LayoutDashboard,
    Users,
    FileCheck,
    Truck,
    FileText,
    ShoppingCart,
    Package,
    CheckSquare,
    RotateCcw,
    Landmark,
    Building2,
    BarChart3,
    Settings,
    LogOut,
    UserCircle,
    MoreVertical,
    HelpCircle,
    Warehouse,
    Wallet,
    ChevronRight,
    Banknote,
    ArrowRightLeft,
    CalendarDays,
    NotebookPen,
    Layers,
    Shirt,
    CalendarCog,
    HandCoins,
    ClipboardCopy,
    ClipboardList,
    ReceiptText,
    ShoppingBag,
    ChartNoAxesCombined,
    Sparkles,
    ScrollText,
    Boxes,
} from "lucide-react"
import {
    Collapsible,
    CollapsibleTrigger,
    CollapsibleContent,
} from "@/components/ui/collapsible"

interface NavItem {
    label: string
    href?: string
    icon?: React.ComponentType<{ className?: string }>
    badge?: number
    permission?: PermissionKey
    children?: NavItem[]
}

const navGroups: { label: string; items: NavItem[] }[] = [
    {
        label: "Général",
        items: [
            { label: "Tableau de Bord", href: "/", icon: LayoutDashboard },
        ],
    },
    {
        label: "Ventes",
        items: [
            { label: "Clients", href: "/clients", icon: Users, permission: "clients:voir" },
            { label: "Devis", href: "/devis", icon: ClipboardList, permission: "devis:voir" },
            { label: "Bons de Commande", href: "/bons-commande", icon: ClipboardCopy, permission: "bonsDeCommande:voir" },
            { label: "Bons de Livraison", href: "/bons-livraison", icon: Truck, permission: "bonsLivraison:voir" },
            { label: "Factures", href: "/factures", icon: FileText, permission: "factures:voir" },
            { label: "Avoirs", href: "/avoirs", icon: ReceiptText, permission: "avoirs:voir" },
            { label: "POS / Vente Rapide", href: "/pos", icon: ShoppingCart, permission: "produits:voir" },
        ],
    },
    {
        label: "Achats & Dépenses",
        items: [
            { label: "Fournisseurs", href: "/fournisseurs", icon: Users, permission: "fournisseurs:voir" },
            {
                label: "Achats",
                icon: ShoppingBag,
                permission: "achats:voir",
                children: [
                    { label: "Bons de Livraison", href: "/achats/bl", permission: "achats:voir" },
                    { label: "Factures d'achat", href: "/achats", permission: "achats:voir" },
                ],
            },
            { label: "Rapports", href: "/rapports", icon: ChartNoAxesCombined, permission: "rapports:voir" },
        ],
    },
    {
        label: "Finance",
        items: [
            { label: "Trésorerie", href: "/paiements", icon: Wallet, permission: "paiements:voir" },
            { label: "Espèces", href: "/paiements/especes", icon: HandCoins, permission: "paiements:voir" },
            { label: "Virements", href: "/paiements/virements", icon: ArrowRightLeft, permission: "paiements:voir" },
            { label: "Chèques", href: "/cheques", icon: Banknote, permission: "cheques:voir" },
            { label: "Effets de Commerce", href: "/effets", icon: Landmark, permission: "paiements:voir" },
        ],
    },
    {
        label: "Stock",
        items: [
            { label: "Inventaire", href: "/inventaire", icon: Warehouse, permission: "produits:voir" },
            { label: "Produits", href: "/produits", icon: Package, permission: "produits:voir" },
            { label: "Mouvements", href: "/stock-mouvements", icon: RotateCcw, permission: "stocks_mouvements:voir" },
        ],
    },
    {
        label: "Atelier",
        items: [
            { label: "Modéle", href: "/atelier/modeles", icon: Shirt, permission: "modeles:voir" },
            { label: "Fiches Techniques", href: "/atelier/fiche-technique", icon: Layers, permission: "fiches_techniques:voir" },
            { label: "Matières Premières", href: "/atelier/matieres-premieres", icon: ScrollText, permission: "matieres:voir" },
            { label: "Studio Design", href: "/produits", icon: Sparkles, permission: "produits:voir" },
            { label: "Commandes", href: "/atelier/commandes", icon: NotebookPen, permission: "commandes:voir" },
            { label: "Planning", href: "/atelier/planning", icon: CalendarDays, permission: "planning:voir" },
            {
                label: "Production",
                icon: CalendarCog,
                children: [
                    { label: "Ordres de Fabrication", href: "/atelier/production", permission: "production:voir" },
                    { label: "Packing List & Colisage", href: "/atelier/production/packing-list", icon: Boxes, permission: "packing:voir" },
                ],
            },
        ],
    },
    {
        label: "Export",
        items: [
            { label: "Exports", href: "/exports", icon: Building2, permission: "parametres:voir" },
        ],
    },
]


export function AppSidebar({
    invoiceCount,
    chequeCount,
    stockAlerts,
}: {
    invoiceCount?: number
    chequeCount?: number
    stockAlerts?: number
}) {
    const { data: session } = useSession()
    const { can } = usePermissions()
    const router = useRouter()
    // Déconnexion serveur (`/api/auth/logout` détruit les 4 cookies d'auth, y
    // compris le `__session-marker` que `signOut()` d'Auth.js laissait vivre).
    const logout = useLogout()

    const userName = session?.user?.name ?? "Utilisateur"
    const userEmail = session?.user?.email ?? ""

    const initials = userName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()

    const getBadge = (href: string): { value: number; isGlobal?: boolean } | undefined => {
        if (href === "/factures") return invoiceCount !== undefined ? { value: invoiceCount } : undefined
        if (href === "/cheques") return chequeCount !== undefined ? { value: chequeCount } : undefined
        if (href === "/produits" && (stockAlerts ?? 0) > 0) return { value: stockAlerts!, isGlobal: true }
        return undefined
    }

    return (
        <Sidebar variant="inset" collapsible="icon" className="sidebar-no-bg">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/">
                                <Logo />
                                <div className="grid flex-1 text-left leading-tight">
                                    <span className="font-heading font-semibold truncate">
                                        FacturaPro TN
                                    </span>
                                    <span className="text-xs text-muted-foreground truncate">
                                        Gestion Commerciale
                                    </span>
                                </div>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                {navGroups.map((group) => {
                    const visibleItems = group.items.filter(
                        (item) => !item.permission || can(item.permission)
                    )
                    if (visibleItems.length === 0) return null

                    return (
                        <SidebarGroup key={group.label}>
                            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
                            <SidebarGroupContent>
                                <SidebarMenu>
                                    {visibleItems.map((item) => {
                                        if (item.children) {
                                            const visibleChildren = item.children.filter(
                                                (c) => !c.permission || can(c.permission)
                                            )
                                            if (visibleChildren.length === 0) return null
                                            return (
                                                <Collapsible key={item.label} asChild defaultOpen className="group/collapsible">
                                                    <SidebarMenuItem>
                                                        <CollapsibleTrigger asChild>
                                                            <SidebarMenuButton tooltip={item.label}>
                                                                {item.icon && <item.icon />}
                                                                <span>{item.label}</span>
                                                                <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                                                            </SidebarMenuButton>
                                                        </CollapsibleTrigger>
                                                        <CollapsibleContent>
                                                            <SidebarMenuSub>
                                                                {visibleChildren.map((child) => {
                                                                    const childBadge = getBadge(child.href!)
                                                                    return (
                                                                        <SidebarMenuSubItem key={child.href!}>
                                                                            <SidebarMenuSubButton asChild>
                                                                                <Link href={child.href!}>
                                                                                    <span>{child.label}</span>
                                                                                </Link>
                                                                            </SidebarMenuSubButton>
                                                                            {childBadge !== undefined && childBadge.value > 0 && (
                                                                                <SidebarMenuBadge className={childBadge.isGlobal ? "bg-muted text-muted-foreground border border-border" : "bg-foreground text-background dark:bg-background dark:text-foreground"}>
                                                                                    {childBadge.value}
                                                                                </SidebarMenuBadge>
                                                                            )}
                                                                        </SidebarMenuSubItem>
                                                                    )
                                                                })}
                                                            </SidebarMenuSub>
                                                        </CollapsibleContent>
                                                    </SidebarMenuItem>
                                                </Collapsible>
                                            )
                                        }
                                        const badge = getBadge(item.href!)

                                        return (
                                            <SidebarMenuItem key={item.href!}>
                                                <SidebarMenuButton
                                                    asChild
                                                    tooltip={item.label}
                                                >
                                                    <Link href={item.href!}>
                                                        {item.icon && <item.icon />}
                                                        <span>{item.label}</span>
                                                    </Link>
                                                </SidebarMenuButton>
                                                {badge !== undefined && badge.value > 0 && (
                                                    <SidebarMenuBadge className={badge.isGlobal ? "bg-muted text-muted-foreground border border-border" : "bg-foreground text-background dark:bg-background dark:text-foreground"}>
                                                        {badge.value}
                                                    </SidebarMenuBadge>
                                                )}
                                            </SidebarMenuItem>
                                        )
                                    })}
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </SidebarGroup>
                    )
                })}
            </SidebarContent>

            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <SidebarMenuButton
                                    size="lg"
                                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                                >
                                    <Avatar className="h-8 w-8 rounded-lg">
                                        <AvatarFallback className="rounded-lg text-xs font-bold">
                                            {initials}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="grid flex-1 text-left text-sm leading-tight">
                                        <span className="truncate font-medium">
                                            {userName}
                                        </span>
                                        <span className="truncate text-xs text-muted-foreground">
                                            {userEmail || "Utilisateur"}
                                        </span>
                                    </div>
                                    <MoreVertical className="ml-auto size-4" />
                                </SidebarMenuButton>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                                side="right"
                                align="end"
                                sideOffset={4}
                            >
                                <DropdownMenuLabel className="p-0 font-normal">
                                    <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                                        <Avatar className="h-8 w-8 rounded-lg">
                                            <AvatarFallback className="rounded-lg text-xs font-bold">
                                                {initials}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="grid flex-1 text-left text-sm leading-tight">
                                            <span className="truncate font-medium">
                                                {userName}
                                            </span>
                                            <span className="truncate text-xs text-muted-foreground">
                                                {userEmail || "Utilisateur"}
                                            </span>
                                        </div>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                    <Link href="/parametres/profil">
                                        <UserCircle />
                                        Profil
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link href="/parametres/entreprises">
                                        <Settings />
                                        Paramètres
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link href="/aide">
                                        <HelpCircle />
                                        Aide
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={() =>
                                        logout.mutate(undefined, {
                                            onSuccess: ({ redirectTo }) =>
                                                router.push(redirectTo),
                                        })
                                    }
                                >
                                    <LogOut />
                                    Déconnexion
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>

            <SidebarRail />
        </Sidebar>
    )
}
