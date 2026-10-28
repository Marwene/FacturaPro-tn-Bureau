"use client"

import { useEffect, useMemo, useCallback, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { useReducedMotion, motion } from "motion/react"
import { FileText } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { usePendingBLs } from "@/hooks/use-pending-bl"
import { usePendingBLAlertStore } from "@/lib/stores/pending-bl-store"
import { GenerateInvoiceDialog } from "@/components/factures/generate-invoice-dialog"
import { FloatingAlertModal, type ClientSelection } from "@/components/factures/floating-alert-modal"

const REMINDER_CHECK_INTERVAL = 60_000

export function getProgressColor(percentage: number): {
  badge: string
  ring: string
  fab: string
} {
  if (percentage === 0) return { badge: "bg-red-500", ring: "stroke-red-500", fab: "bg-red-500 hover:bg-red-600" }
  if (percentage < 50) return { badge: "bg-orange-500", ring: "stroke-orange-500", fab: "bg-orange-500 hover:bg-orange-600" }
  if (percentage < 100) return { badge: "bg-yellow-500", ring: "stroke-yellow-500", fab: "bg-yellow-500 hover:bg-yellow-600" }
  return { badge: "bg-green-500", ring: "stroke-green-500", fab: "bg-green-500 hover:bg-green-600" }
}

function ProgressRing({
  percentage,
  strokeColor,
  size = 56,
}: {
  percentage: number
  strokeColor: string
  size?: number
}) {
  const strokeWidth = 3
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percentage / 100) * circumference

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="absolute inset-0 -rotate-90"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-muted/20"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className={`${strokeColor} transition-[stroke-dashoffset] duration-500 ease-out`}
      />
    </svg>
  )
}

export function computeShouldShow(opts: {
  isLoading: boolean
  totalBLs: number
  percentage: number
  dismissedToday: boolean
  reminderCount: number
  lastReminderTime: string
  nextReminderMinutes: number
}): boolean {
  if (opts.isLoading) return false
  if (opts.totalBLs === 0) return false
  if (opts.percentage >= 100) return false
  if (opts.dismissedToday) {
    if (opts.reminderCount >= 4) return false
    if (!opts.lastReminderTime || !opts.nextReminderMinutes) return false
    const lastTime = new Date(opts.lastReminderTime).getTime()
    const now = Date.now()
    const elapsed = (now - lastTime) / 60_000
    return elapsed >= opts.nextReminderMinutes
  }
  return true
}

export function FloatingAlert() {
  const { data, isLoading } = usePendingBLs()
  const reduce = useReducedMotion()
  const [tick, setTick] = useState(0)
  const [selectedClient, setSelectedClient] = useState<ClientSelection | null>(null)

  const {
    isMinimized,
    dismissedToday,
    reminderCount,
    lastReminderTime,
    nextReminderMinutes,
    minimize,
    expand,
    dismissToday,
    recordReminder,
    resetIfNewDay,
  } = usePendingBLAlertStore()

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const totalBLs = data?.totalBLs ?? 0

  // Les BLs affichés sont ceux NON facturés (l'API filtre invoices: { none: {} })
  // Donc treatedBLs = 0 tant que l'utilisateur ne génère pas de facture
  // Le pourcentage sera toujours 0 (rouge) jusqu'à ce que tous les BLs soient facturés
  const treatedBLs = 0
  const percentage = 0
  const colors = getProgressColor(percentage)

  const checkReminder = useCallback(() => {
    resetIfNewDay()
    setTick((t) => t + 1)
  }, [resetIfNewDay])

  // Justification useEffect : timer setInterval (REMINDER_CHECK_INTERVAL) — l'horloge de rappel des BLs doit tiquer périodiquement pour relancer resetIfNewDay et le compteur d'état (non réactif : intervalle navigateur, aucun changement d'état ne déclenche le prochain tick).
  useEffect(() => {
    timerRef.current = setInterval(checkReminder, REMINDER_CHECK_INTERVAL)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [checkReminder])

  const shouldShow = useMemo(() => {
    void tick
    return computeShouldShow({
      isLoading,
      totalBLs,
      percentage,
      dismissedToday,
      reminderCount,
      lastReminderTime,
      nextReminderMinutes,
    })
  }, [
    tick,
    isLoading,
    totalBLs,
    percentage,
    dismissedToday,
    reminderCount,
    lastReminderTime,
    nextReminderMinutes,
  ])

  const handleMinimize = useCallback(() => {
    minimize()
  }, [minimize])

  const handleDismissToday = useCallback(() => {
    dismissToday()
  }, [dismissToday])

  const handleFabClick = useCallback(() => {
    expand()
    if (dismissedToday) {
      recordReminder()
    }
  }, [expand, dismissedToday, recordReminder])

  if (!shouldShow && !isMinimized) return null

  // FAB rendu via createPortal pour être toujours visible (hors du flux du dashboard)
  const fabElement = isMinimized ? (
    <motion.button
      key="fab"
      type="button"
      onClick={handleFabClick}
      initial={reduce ? undefined : { opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={reduce ? undefined : { opacity: 0, scale: 0.8, y: 20 }}
      transition={reduce ? undefined : { type: "spring", duration: 0.4, bounce: 0.15 }}
      whileHover={reduce ? undefined : { scale: 1.05 }}
      whileTap={{ scale: 0.96 }}
      className={`fixed bottom-6 right-6 z-[9999] flex size-14 items-center justify-center rounded-full shadow-lg transition-[box-shadow] duration-150 hover:shadow-xl focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none ${colors.fab}`}
      aria-label={`BLs en attente : ${String(totalBLs)}`}
    >
      <ProgressRing percentage={percentage} strokeColor={colors.ring} />
      <div className="relative flex flex-col items-center gap-0.5">
        <FileText className="size-5 text-white" />
        <Badge
          variant="default"
          className="absolute -top-5 -right-5 min-w-5 justify-center rounded-full px-1 py-0 text-[10px] font-semibold tabular-nums bg-white text-red-500"
        >
          {String(totalBLs)}
        </Badge>
      </div>
    </motion.button>
  ) : null

  return (
    <>
      {/* FAB via createPortal pour être toujours visible */}
      {typeof window !== "undefined" && fabElement && createPortal(fabElement, document.body)}

      {/* Modal - centré quand pas minimisé */}
      {shouldShow && !isMinimized && (
        <FloatingAlertModal
          clients={data?.clients ?? []}
          totalBLs={totalBLs}
          reduce={reduce}
          onMinimize={handleMinimize}
          onDismissToday={handleDismissToday}
          onSelectClient={setSelectedClient}
        />
      )}

      {/* GenerateInvoiceDialog */}
      {selectedClient && (
        <GenerateInvoiceDialog
          open={!!selectedClient}
          onOpenChange={(open) => {
            if (!open) setSelectedClient(null)
          }}
          clientId={selectedClient.clientId}
          clientName={selectedClient.clientName}
          blIds={selectedClient.blIds}
        />
      )}
    </>
  )
}
