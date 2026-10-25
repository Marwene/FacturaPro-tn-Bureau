"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

const REMINDER_SEQUENCE = [30, 15, 5, 2] as const

interface PendingBLAlertState {
  isMinimized: boolean
  dismissedToday: boolean
  lastDismissDate: string
  reminderCount: number
  lastReminderTime: string
  nextReminderMinutes: number
}

interface PendingBLAlertActions {
  minimize: () => void
  expand: () => void
  dismissToday: () => void
  recordReminder: () => void
  resetIfNewDay: () => void
}

type PendingBLAlertStore = PendingBLAlertState & PendingBLAlertActions

function getTodayDateString(): string {
  return new Date().toISOString().split("T")[0]
}

function getNextReminderMinutes(currentCount: number): number {
  const index = Math.min(currentCount, REMINDER_SEQUENCE.length - 1)
  return REMINDER_SEQUENCE[index]
}

export const usePendingBLAlertStore = create<PendingBLAlertStore>()(
  persist(
    (set, get) => ({
      isMinimized: false,
      dismissedToday: false,
      lastDismissDate: "",
      reminderCount: 0,
      lastReminderTime: "",
      nextReminderMinutes: 30,

      minimize: () => set({ isMinimized: true }),

      expand: () => set({ isMinimized: false }),

      dismissToday: () =>
        set({
          dismissedToday: true,
          lastDismissDate: getTodayDateString(),
        }),

      recordReminder: () => {
        const { reminderCount } = get()
        const newCount = reminderCount + 1
        set({
          reminderCount: newCount,
          lastReminderTime: new Date().toISOString(),
          nextReminderMinutes: getNextReminderMinutes(newCount),
        })
      },

      resetIfNewDay: () => {
        const { lastDismissDate } = get()
        const today = getTodayDateString()
        if (lastDismissDate && lastDismissDate !== today) {
          set({
            dismissedToday: false,
            reminderCount: 0,
            lastReminderTime: "",
            nextReminderMinutes: 30,
          })
        }
      },
    }),
    {
      name: "pending-bl-state",
    }
  )
)
