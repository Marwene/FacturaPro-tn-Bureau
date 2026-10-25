import type { Metadata, Viewport } from "next";
import "./globals.css";
import { QueryProvider } from "@/lib/providers/query-provider";
import { ThemeProvider } from "@/lib/providers/theme-provider";
import { SessionProvider } from "@/lib/providers/session-provider";
import { Toaster } from "@/components/ui/sonner";
import { DM_Sans } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: { default: "FacturaPro TN", template: "%s — FacturaPro TN" },
  description: "Gestion Commerciale Tunisienne",
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning className={dmSans.variable}>
      <body className="antialiased" suppressHydrationWarning>
        {/* Ordre obligatoire : QueryProvider AVANT SessionProvider.
            SessionProvider rend <AutoLogout /> qui utilise TanStack Query
            (useAutoLogout → useLogout → useMutation) : sans QueryClientProvider
            parent, le rendu racine crash ("No QueryClient set") et /login renvoie 500. */}
        <ThemeProvider>
          <QueryProvider>
            <SessionProvider>
              <TooltipProvider>
                {children}
              </TooltipProvider>
              <Toaster />
            </SessionProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
