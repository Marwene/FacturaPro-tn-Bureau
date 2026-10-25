"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";

interface ThemeContextValue {
    theme: string;
    setTheme: (t: string) => void;
    themes: string[];
    systemTheme?: string;
}

const ThemeContext = createContext<ThemeContextValue>({
    theme: "light",
    setTheme: () => {},
    themes: ["light", "dark"],
});

export function useTheme() {
    return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<string>("light");
    const [systemTheme, setSystemTheme] = useState<string | undefined>();
    const [mounted, setMounted] = useState(false);

    // Justification useEffect : lecture localStorage + matchMedia (prefers-color-scheme) au montage — thème persisté et préférence système accessibles seulement côté navigateur après hydration (non réactif : localStorage et la media query existent en dehors du cycle React, leur lecture au rendu provoquerait un mismatch SSR).
    useEffect(() => {
        setMounted(true);
        const stored = localStorage.getItem("theme");
        if (stored === "light" || stored === "dark") {
            setThemeState(stored);
        } else {
            const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
            setSystemTheme(prefersDark ? "dark" : "light");
            setThemeState(stored ?? (prefersDark ? "dark" : "light"));
        }
    }, []);

    // Justification useEffect : DOM racine (documentElement.classList) + écriture localStorage — application et persistance du thème sur la balise <html>, cible que le JSX du provider ne couvre pas (non réactif : la classe dark de <html> et localStorage se pilotent uniquement par impératif hors rendu).
    useEffect(() => {
        if (!mounted) return;
        document.documentElement.classList.toggle("dark", theme === "dark");
        localStorage.setItem("theme", theme);
    }, [theme, mounted]);

    const setTheme = useCallback((t: string) => {
        if (t === "light" || t === "dark") setThemeState(t);
    }, []);

    return (
        <ThemeContext.Provider value={{ theme, setTheme, themes: ["light", "dark"], systemTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}
