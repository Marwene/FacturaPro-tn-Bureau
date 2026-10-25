"use client"

import { useTheme } from "@/lib/providers/theme-provider"
import { Sun, Moon, Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { AutoBreadcrumb } from "@/components/auto-breadcrumb"
import { CompanySwitcher } from "./company-switcher"
import { NotificationsPopover } from "./notifications-popover"

interface HeaderProps {
    breadcrumbs?: { label: string; href?: string }[]
    actions?: React.ReactNode
}

export function Header({ breadcrumbs, actions }: HeaderProps) {
    const { theme, setTheme } = useTheme()

    return (
        <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
            <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
                <SidebarTrigger className="-ml-1 h-8 w-8" />
                <Separator
                    orientation="vertical"
                    className="mx-2 data-[orientation=vertical]:h-8"
                />
                <div className="hidden sm:block">
                    {breadcrumbs ? (
                        <span className="text-base font-medium">
                            {breadcrumbs[breadcrumbs.length - 1]?.label}
                        </span>
                    ) : (
                        <AutoBreadcrumb />
                    )}
                </div>
                <div className="ml-auto flex items-center gap-2">

                    <div className="hidden sm:block">
                        <CompanySwitcher />
                    </div>
                    {actions}
                    <NotificationsPopover />
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                        aria-label="Toggle theme"
                    >
                        <Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                        <Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    </Button>
                </div>
            </div>
        </header>
    )
}
