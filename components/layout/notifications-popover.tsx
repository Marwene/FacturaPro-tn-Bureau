"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Bell, CheckCheck, Loader2 } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { useMarkNotificationsRead, useUnreadNotifications } from "@/hooks/use-notifications"

export function NotificationsPopover() {
    const [open, setOpen] = useState(false)
    const markAllRead = useMarkNotificationsRead()

    const { data, isLoading } = useUnreadNotifications()

    const nonLues = data?.nonLues ?? 0
    const notifications = data?.notifications ?? []

    const handleMarkAllRead = () => {
        const ids = notifications.filter((n) => !n.lue).map((n) => n.id)
        if (ids.length > 0) markAllRead.mutate(ids)
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon-sm" className="relative" aria-label="Notifications">
                    <Bell className="size-4" />
                    {nonLues > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white leading-none">
                            {nonLues > 9 ? "9+" : nonLues}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0" sideOffset={8}>
                <div className="flex items-center justify-between px-3 py-2 border-b">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notifications</span>
                    {nonLues > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs gap-1"
                            onClick={handleMarkAllRead}
                            disabled={markAllRead.isPending}
                        >
                            {markAllRead.isPending ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                                <CheckCheck className="h-3 w-3" />
                            )}
                            Tout lire
                        </Button>
                    )}
                </div>
                <div className="max-h-72 overflow-y-auto">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="py-8 text-center text-xs text-muted-foreground">
                            Aucune notification
                        </div>
                    ) : (
                        notifications.map((n) => (
                            <div
                                key={n.id}
                                className={cn(
                                    "px-3 py-2.5 text-sm border-b last:border-0 hover:bg-muted/50 transition-colors cursor-pointer",
                                    !n.lue && "bg-muted/20",
                                )}
                                onClick={() => {
                                    if (n.effetId) window.location.href = `/effets/${n.effetId}`
                                }}
                            >
                                <p className="text-xs font-medium">{n.title}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                                <p className="text-[10px] text-muted-foreground/60 mt-1">
                                    {new Date(n.createdAt).toLocaleDateString("fr-TN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                                </p>
                            </div>
                        ))
                    )}
                </div>
            </PopoverContent>
        </Popover>
    )
}
