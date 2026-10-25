"use client";

import { useReducedMotion, motion } from "motion/react";
import { Card, CardHeader, CardTitle, CardDescription, CardAction, CardFooter } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
    title: string;
    value: string;
    subtitle?: string;
    subtitleVariant?: "default" | "success" | "danger" | "warning";
    icon?: LucideIcon;
    variant?: "default" | "dark";
    className?: string;
    valueClassName?: string;
    trend?: string;
    trendVariant?: "up" | "down" | "neutral";
}

export function StatCard({
    title,
    value,
    subtitle,
    subtitleVariant = "default",
    icon: Icon,
    variant = "default",
    className,
    valueClassName,
    trend,
    trendVariant = "neutral",
}: StatCardProps) {
    const reduce = useReducedMotion();

    return (
        <motion.div
            initial={false}
            whileInView={reduce ? {} : { opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            whileHover={reduce ? {} : { y: -2 }}
            className={cn(
                "*:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs dark:*:data-[slot=card]:bg-card",
                className
            )}
        >
            <Card
                className={cn(
                    "h-full",
                    variant === "dark" && "bg-foreground text-background"
                )}
            >
                <CardHeader>
                    <CardDescription
                        className={cn(
                            variant === "dark" && "text-background/70"
                        )}
                    >
                        {title}
                    </CardDescription>
                    <CardTitle
                        className={cn(
                            "text-2xl font-semibold tabular-nums",
                            variant === "dark" ? "text-background" : "text-foreground",
                            subtitleVariant === "success" && "text-emerald-600 dark:text-emerald-400",
                            subtitleVariant === "danger" && "text-red-600 dark:text-red-400",
                            subtitleVariant === "warning" && "text-amber-600 dark:text-amber-400",
                            valueClassName
                        )}
                    >
                        {value}
                    </CardTitle>
                    {Icon && (
                        <CardAction>
                            <Icon
                                className={cn(
                                    "size-4",
                                    variant === "dark" ? "text-background/50" : "text-muted-foreground"
                                )}
                            />
                        </CardAction>
                    )}
                </CardHeader>
                {(subtitle || trend) && (
                    <CardFooter className="flex-col items-start gap-1.5 text-sm">
                        {subtitle && (
                            <div className="line-clamp-1 flex gap-2 font-medium">{subtitle}</div>
                        )}
                        {trend && (
                            <div className={cn(
                                "text-xs font-medium",
                                trendVariant === "up" && "text-emerald-600 dark:text-emerald-400",
                                trendVariant === "down" && "text-red-600 dark:text-red-400",
                                trendVariant === "neutral" && "text-muted-foreground"
                            )}>
                                {trend}
                            </div>
                        )}
                    </CardFooter>
                )}
            </Card>
        </motion.div>
    );
}
