"use client"

import { motion } from "motion/react"
import { FileText, Minimize2, Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MoneyCell } from "@/components/shared/money-cell"
import { usePendingBLs } from "@/hooks/use-pending-bl"

type PendingBLClient = NonNullable<
  ReturnType<typeof usePendingBLs>["data"]
>["clients"][number]

export type ClientSelection = {
  clientId: string
  clientName: string
  blIds: string[]
}

type FloatingAlertModalProps = {
  clients: PendingBLClient[]
  totalBLs: number
  reduce: boolean | null
  onMinimize: () => void
  onDismissToday: () => void
  onSelectClient: (selection: ClientSelection) => void
}

export function FloatingAlertModal({
  clients,
  totalBLs,
  reduce,
  onMinimize,
  onDismissToday,
  onSelectClient,
}: FloatingAlertModalProps) {
  return (
    <motion.div
      key="modal"
      initial={reduce ? undefined : { opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={reduce ? undefined : { opacity: 0, scale: 0.95 }}
      transition={reduce ? undefined : { duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="BLs en attente de facturation"
    >
      <div
        className="absolute inset-0 bg-black/10 backdrop-blur-xs"
        aria-hidden="true"
      />
      <motion.div
        className="relative w-full max-w-md rounded-xl bg-popover p-0 shadow-xl ring-1 ring-border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-muted">
              <FileText className="size-4 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-sm font-medium leading-none">
                Bons de Livraison à Facturer
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {String(totalBLs)} BL{totalBLs > 1 ? "s" : ""} en attente
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onMinimize}
            aria-label="Réduire"
            className="transition-transform duration-150 hover:bg-muted"
          >
            <Minimize2 className="size-4" />
          </Button>
        </div>

        <div className="px-5 py-3">
          <ScrollArea className="max-h-48">
            <div className="space-y-1.5">
              {clients.map((client) => (
                <div
                  key={client.clientId}
                  className="flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-7 items-center justify-center rounded-md bg-muted text-[11px] font-medium text-muted-foreground">
                      {client.clientName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium leading-tight">
                        {client.clientName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {String(client.blCount)} BL{client.blCount > 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <MoneyCell
                      value={client.totalTTC}
                      className="text-sm font-semibold text-foreground"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        onSelectClient({
                          clientId: client.clientId,
                          clientName: client.clientName,
                          blIds: client.bls.map((bl) => bl.id),
                        })
                      }
                      className="ml-2 text-xs"
                    >
                      Générer
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        <div className="border-t border-border px-5 py-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {String(totalBLs)} BL{totalBLs > 1 ? "s" : ""} en attente de facturation
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onMinimize}
            className="gap-1.5 text-muted-foreground"
          >
            <Minimize2 className="size-3.5" />
            Réduire
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismissToday}
            className="gap-1.5 text-muted-foreground"
          >
            <Bell className="size-3.5" />
            Ne plus aujourd&apos;hui
          </Button>
        </div>
      </motion.div>
    </motion.div>
  )
}
