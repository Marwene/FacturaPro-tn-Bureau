"use client";

import { useReducedMotion, motion, AnimatePresence } from "motion/react";
import { usePathname } from "next/navigation";

export function PageTransition({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const reduce = useReducedMotion();

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={pathname}
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: -12 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="flex-1 flex flex-col overflow-hidden"
            >
                {children}
            </motion.div>
        </AnimatePresence>
    );
}
