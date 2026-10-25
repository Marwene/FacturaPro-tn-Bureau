import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"
import type { DayButton } from "react-day-picker"

export type PeriodeEcheances = "today" | "week" | "all"

interface CalendrierEcheancesProps {
    periode: PeriodeEcheances
    onPeriodeChange: (periode: PeriodeEcheances) => void
    jourSelectionne: Date | undefined
    onJourChange: (date: Date | undefined) => void
    moisAffiche: Date
    onMoisChange: (date: Date) => void
    joursEntree: Date[]
    joursSortie: Date[]
}

/** Jour du calendrier avec pastilles entrée / sortie (forme + couleur, jamais la couleur seule : sémantique annoncée par les filtres ci-dessus). */
function EcheanceDayButton({ day, modifiers, ...props }: React.ComponentProps<typeof DayButton>) {
    const isSelected = modifiers?.selected
    const isToday = modifiers?.today

    return (
        <Button
            variant="ghost"
            size="icon"
            className={cn(
                "relative size-7 p-0 text-xs font-normal transition-colors",
                isSelected && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                isToday && !isSelected && "bg-muted text-foreground",
                !isSelected && !isToday && "hover:bg-accent hover:text-accent-foreground",
            )}
            {...props}
        >
            {day.date.getDate()}
            {(modifiers?.entree || modifiers?.sortie) && (
                <span className="absolute -bottom-px left-1/2 flex gap-px -translate-x-1/2">
                    {modifiers?.entree && <span className="size-1 rounded-full bg-emerald-500" />}
                    {modifiers?.sortie && <span className="size-1 rounded-full bg-rose-500" />}
                </span>
            )}
        </Button>
    )
}

export function CalendrierEcheances({
    periode,
    onPeriodeChange,
    jourSelectionne,
    onJourChange,
    moisAffiche,
    onMoisChange,
    joursEntree,
    joursSortie,
}: CalendrierEcheancesProps) {
    return (
        <div className="flex flex-col gap-3">
            <ToggleGroup
                type="single"
                value={periode}
                onValueChange={(value) => value && onPeriodeChange(value as PeriodeEcheances)}
                size="sm"
                className="justify-start"
            >
                <ToggleGroupItem value="today" size="sm" className="h-7 px-2.5 text-[11px]">Aujourd&apos;hui</ToggleGroupItem>
                <ToggleGroupItem value="week" size="sm" className="h-7 px-2.5 text-[11px]">Semaine</ToggleGroupItem>
                <ToggleGroupItem value="all" size="sm" className="h-7 px-2.5 text-[11px]">Tout</ToggleGroupItem>
            </ToggleGroup>

            <Calendar
                mode="single"
                selected={jourSelectionne}
                onSelect={onJourChange}
                month={moisAffiche}
                onMonthChange={onMoisChange}
                modifiers={{ entree: joursEntree, sortie: joursSortie }}
                components={{ DayButton: EcheanceDayButton }}
                showOutsideDays={false}
                className="[&_[data-slot=calendar]]:w-full"
            />
        </div>
    )
}
