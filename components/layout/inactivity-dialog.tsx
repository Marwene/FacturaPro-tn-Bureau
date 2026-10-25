"use client";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Timer, LogOut, ShieldCheck } from "lucide-react";

interface InactivityDialogProps {
    open: boolean;
    remainingSeconds: number;
    onStayConnected: () => void;
    onLogout: () => void;
}

export function InactivityDialog({
    open,
    remainingSeconds,
    onStayConnected,
    onLogout,
}: InactivityDialogProps) {
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    const timeDisplay = minutes > 0
        ? `${minutes}:${seconds.toString().padStart(2, "0")}`
        : `${seconds}s`;

    // Calculate progress percentage (warning shows at 2 min = 120s)
    const progress = Math.max(0, (remainingSeconds / 120) * 100);

    return (
        <AlertDialog open={open}>
            <AlertDialogContent className="sm:max-w-md">
                <AlertDialogHeader className="text-center sm:text-center">
                    <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 ring-1 ring-amber-500/20">
                        <Timer className="h-7 w-7 text-amber-500 animate-pulse" />
                    </div>
                    <AlertDialogTitle className="text-lg">
                        Session inactive
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-sm text-muted-foreground">
                        Votre session va expirer en raison d&apos;inactivité.
                        Souhaitez-vous rester connecté ?
                    </AlertDialogDescription>
                </AlertDialogHeader>

                {/* Countdown display */}
                <div className="flex flex-col items-center gap-3 py-4">
                    <div className="relative flex h-20 w-20 items-center justify-center">
                        {/* Circular progress */}
                        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 80 80">
                            <circle
                                cx="40"
                                cy="40"
                                r="36"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                                className="text-muted/30"
                            />
                            <circle
                                cx="40"
                                cy="40"
                                r="36"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeDasharray={`${2 * Math.PI * 36}`}
                                strokeDashoffset={`${2 * Math.PI * 36 * (1 - progress / 100)}`}
                                className={
                                    remainingSeconds <= 30
                                        ? "text-red-500 transition-all duration-1000"
                                        : "text-amber-500 transition-all duration-1000"
                                }
                            />
                        </svg>
                        <span
                            className={`text-xl font-bold tabular-nums ${
                                remainingSeconds <= 30 ? "text-red-500" : "text-amber-500"
                            }`}
                        >
                            {timeDisplay}
                        </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Déconnexion automatique à l&apos;expiration
                    </p>
                </div>

                <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                    <AlertDialogCancel
                        onClick={onLogout}
                        className="gap-2"
                    >
                        <LogOut className="h-4 w-4" />
                        Se déconnecter
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={onStayConnected}
                        className="gap-2"
                    >
                        <ShieldCheck className="h-4 w-4" />
                        Rester connecté
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
