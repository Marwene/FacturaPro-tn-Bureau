"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import { useAutoLogout } from "@/hooks/use-auto-logout";
import { InactivityDialog } from "@/components/layout/inactivity-dialog";


function AutoLogout() {
    const { showWarning, remainingSeconds, handleStayConnected, handleLogout } =
        useAutoLogout();

    return (
        <InactivityDialog
            open={showWarning}
            remainingSeconds={remainingSeconds}
            onStayConnected={handleStayConnected}
            onLogout={handleLogout}
        />
    );
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
    return (
        <NextAuthSessionProvider>
            <AutoLogout />
            {children}
        </NextAuthSessionProvider>
    );
}
