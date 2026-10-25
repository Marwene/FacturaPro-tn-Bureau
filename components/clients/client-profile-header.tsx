"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/shared/page-header"
import { Mail, Phone, MapPin, Globe, Edit2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Separator } from "../ui/separator"

const getInitials = (name: string) =>
  name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase()

const getGradientBg = (name: string) => {
  const colors = [
    "from-blue-500/10 to-indigo-500/10 text-blue-600 border-blue-200/30",
    "from-emerald-500/10 to-teal-500/10 text-emerald-600 border-emerald-200/30",
    "from-violet-500/10 to-purple-500/10 text-violet-600 border-violet-200/30",
    "from-rose-500/10 to-pink-500/10 text-rose-600 border-rose-200/30",
    "from-amber-500/10 to-orange-500/10 text-amber-600 border-amber-200/30",
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

interface ClientProfileHeaderProps {
  raisonSociale: string
  actif: boolean
  email?: string | null
  telephone?: string | null
  siteWeb?: string | null
  adresse?: string | null
  ville?: string | null
  codePostal?: string | null
  onEdit: () => void
}

export function ClientProfileHeader({
  raisonSociale, actif, email, telephone, siteWeb, adresse, ville, codePostal, onEdit,
}: ClientProfileHeaderProps) {
  return (
    <div className="overflow-hidden">
      <div className="p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4 flex-1">
            <div className={cn(
              "size-14 md:size-16 rounded-2xl flex items-center justify-center font-bold text-lg border shadow-sm shrink-0",
              getGradientBg(raisonSociale)
            )}>
              {getInitials(raisonSociale)}
            </div>
            <div className="flex flex-col gap-1.5 flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <PageHeader title={raisonSociale} className="min-w-0" />
                <Badge variant={actif ? "outline" : "destructive"} className={cn(
                  actif && "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                )}>
                  {actif ? "Actif" : "Inactif"}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                {email && (
                  <a href={`mailto:${email}`} className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                    <Mail className="size-3.5" /> {email}
                  </a>
                )}
                {telephone && (
                  <a href={`tel:${telephone}`} className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                    <Phone className="size-3.5" /> {telephone}
                  </a>
                )}
                {siteWeb && (
                  <a href={siteWeb} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-primary hover:underline transition-colors">
                    <Globe className="size-3.5" /> Site web
                  </a>
                )}
                {adresse && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="size-3.5" />
                    <span className="truncate">{adresse}{ville ? `, ${ville}` : ""}{codePostal ? ` ${codePostal}` : ""}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 self-stretch md:self-auto justify-end">
            <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs" onClick={onEdit}>
              <Edit2 className="size-3.5" /> Modifier client
            </Button>
          </div>
        </div>
      </div>
      <Separator />
    </div>

  )
}
