import type { ColumnDef } from "@tanstack/react-table"
import type { CartonType } from "@/hooks/use-carton-types"
import { Button } from "@/components/ui/button"
import { Pencil, Trash2 } from "lucide-react"

function dimCell(value: number | null | undefined) {
  return value ?? "—"
}

interface CartonTypeColumnsProps {
  onEdit: (item: CartonType) => void
  onDelete: (item: CartonType) => void
}

export function cartonTypeColumns({
  onEdit,
  onDelete,
}: CartonTypeColumnsProps): ColumnDef<CartonType>[] {
  return [
    {
      accessorKey: "nom",
      header: "Nom",
      cell: (info) => <span className="text-sm font-medium">{info.row.original.nom}</span>,
    },
    {
      accessorKey: "capacite",
      header: "Capacité (pièces)",
      cell: (info) => <span className="text-sm">{info.row.original.capacite}</span>,
    },
    {
      accessorKey: "longueur",
      header: "Longueur (mm)",
      cell: (info) => (
        <span className="text-sm text-muted-foreground">{dimCell(info.row.original.longueur)}</span>
      ),
    },
    {
      accessorKey: "largeur",
      header: "Largeur (mm)",
      cell: (info) => (
        <span className="text-sm text-muted-foreground">{dimCell(info.row.original.largeur)}</span>
      ),
    },
    {
      accessorKey: "hauteur",
      header: "Hauteur (mm)",
      cell: (info) => (
        <span className="text-sm text-muted-foreground">{dimCell(info.row.original.hauteur)}</span>
      ),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: (info) => {
        const row = info.row.original
        return (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onEdit(row)}
              title="Modifier"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => onDelete(row)}
              title="Supprimer"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )
      },
    },
  ]
}
