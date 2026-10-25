"use client"

import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Save, Send, X, type LucideIcon } from "lucide-react"

interface Action {
  label: string
  variant?: "default" | "outline" | "ghost" | "destructive"
  icon?: LucideIcon
  onClick: () => void
  disabled?: boolean
}

interface FormActionsProps {
  backHref: string
  draft?: Action
  primary: Action
  extra?: Action
}

export function FormActions({ backHref, draft, primary, extra }: FormActionsProps) {
  return (
    <div className="sticky bottom-0 z-10 mt-4 flex items-center justify-end gap-2 border-t bg-background px-4 py-3">
      <Button variant="ghost" asChild>
        <Link href={backHref}>
          <X className="h-4 w-4" />
          Annuler
        </Link>
      </Button>

      <div className="flex-1" />

      {draft && (
        <Button variant={draft.variant ?? "outline"} onClick={draft.onClick} disabled={draft.disabled}>
          {draft.icon ? <draft.icon className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {draft.label}
        </Button>
      )}

      {extra && (
        <Button variant={extra.variant ?? "default"} onClick={extra.onClick} disabled={extra.disabled}>
          {extra.icon && <extra.icon className="h-4 w-4" />}
          {extra.label}
        </Button>
      )}

      <Button variant={primary.variant ?? "default"} onClick={primary.onClick} disabled={primary.disabled}>
        {primary.icon ? <primary.icon className="h-4 w-4" /> : <Send className="h-4 w-4" />}
        {primary.label}
      </Button>
    </div>
  )
}
