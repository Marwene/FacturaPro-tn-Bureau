"use client"

import { useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { DataTable } from "@/components/data-table"
import {
  useCartonTypes,
  useCreateCartonType,
  useUpdateCartonType,
  useDeleteCartonType,
  type CartonType,
} from "@/hooks/use-carton-types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog"
import { notify } from "@/lib/notify"
import { Boxes, Loader2, Pencil, Plus, Trash2 } from "lucide-react"

interface CartonTypeForm {
  nom: string
  capacite: string
  longueur: string
  largeur: string
  hauteur: string
}

const defaultForm: CartonTypeForm = {
  nom: "",
  capacite: "24",
  longueur: "",
  largeur: "",
  hauteur: "",
}

function dimCell(value: number | null | undefined) {
  return value ?? "—"
}

export function CartonTypesManager() {
  const { data, isLoading, isFetching } = useCartonTypes()
  const create = useCreateCartonType()
  const update = useUpdateCartonType()
  const remove = useDeleteCartonType()

  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<CartonType | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CartonType | null>(null)
  const [form, setForm] = useState<CartonTypeForm>(defaultForm)

  const cartonTypes = data?.cartonTypes ?? []
  const isMutating = create.isPending || update.isPending

  function openCreate() {
    setEditing(null)
    setForm(defaultForm)
    setDialogOpen(true)
  }

  function openEdit(item: CartonType) {
    setEditing(item)
    setForm({
      nom: item.nom,
      capacite: String(item.capacite),
      longueur: item.longueur?.toString() ?? "",
      largeur: item.largeur?.toString() ?? "",
      hauteur: item.hauteur?.toString() ?? "",
    })
    setDialogOpen(true)
  }

  function closeDialog() {
    setDialogOpen(false)
    setEditing(null)
  }

  function handleSubmit() {
    const nom = form.nom.trim()
    const capacite = parseInt(form.capacite, 10)
    if (!nom) {
      notify.warning({
        title: "Nom du type de carton requis",
        description: "Saisissez un nom pour identifier ce type de carton.",
      })
      return
    }
    if (!Number.isFinite(capacite) || capacite < 1) {
      notify.warning({
        title: "Capacité invalide",
        description: "La capacité doit être d'au moins 1 pièce.",
      })
      return
    }
    const optionalDim = (value: string) => {
      const trimmed = value.trim()
      return trimmed === "" ? null : Number(trimmed)
    }
    const payload = {
      nom,
      capacite,
      longueur: optionalDim(form.longueur),
      largeur: optionalDim(form.largeur),
      hauteur: optionalDim(form.hauteur),
    }

    if (editing) {
      update.mutate(
        { id: editing.id, ...payload },
        {
          onSuccess: () => {
            notify.success({ title: `Type de carton « ${nom} » modifié` })
            closeDialog()
          },
          onError: (err: unknown) =>
            notify.error({
              title: "Modification du type de carton impossible",
              error: err,
              context: "lors de la modification d'un type de carton",
              retry: () => update.mutate({ id: editing.id, ...payload }),
            }),
        },
      )
    } else {
      create.mutate(payload, {
        onSuccess: () => {
          notify.success({ title: `Type de carton « ${nom} » créé` })
          closeDialog()
        },
        onError: (err: unknown) =>
          notify.error({
            title: "Création du type de carton impossible",
            error: err,
            context: "lors de la création d'un type de carton",
          }),
      })
    }
  }

  function handleDelete() {
    if (!deleteTarget) return
    remove.mutate(deleteTarget.id, {
      onSuccess: () => {
        notify.success({ title: `Type de carton « ${deleteTarget.nom} » supprimé` })
        setDeleteTarget(null)
      },
      onError: (err: unknown) =>
        notify.error({
          title: "Suppression du type de carton impossible",
          error: err,
          context: "lors de la suppression d'un type de carton",
        }),
    })
  }

  const columns: ColumnDef<CartonType>[] = [
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
              onClick={() => openEdit(row)}
              title="Modifier"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => setDeleteTarget(row)}
              title="Supprimer"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Paramètres de colisage</h1>
          <p className="text-xs text-muted-foreground">
            Configurez les types de cartons utilisés pour le colisage et la répartition automatique.
          </p>
        </div>
        <Button size="sm" className="gap-1.5 text-xs" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5" />
          Ajouter un type de carton
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={cartonTypes}
        loading={isFetching || isLoading}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Rechercher un type de carton..."
        enableColumnVisibility
        pageSize={10}
        pageSizeOptions={[10, 20, 50]}
        renderEmpty={() => (
          <div className="flex flex-col items-center gap-2 py-6">
            <Boxes className="h-6 w-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Aucun type de carton. Ajoutez-en au moins un pour la répartition automatique.
            </p>
          </div>
        )}
      />

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog() }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-base">
              {editing ? "Modifier le type de carton" : "Ajouter un type de carton"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="carton-nom" className="text-xs">Nom</Label>
              <Input
                id="carton-nom"
                value={form.nom}
                onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
                placeholder="Ex : Format A9, Format A12..."
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="carton-capacite" className="text-xs">Capacité (pièces)</Label>
                <Input
                  id="carton-capacite"
                  type="number"
                  min={1}
                  value={form.capacite}
                  onChange={(e) => setForm((f) => ({ ...f, capacite: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="carton-longueur" className="text-xs">Longueur (mm)</Label>
                <Input
                  id="carton-longueur"
                  type="number"
                  min={0}
                  value={form.longueur}
                  onChange={(e) => setForm((f) => ({ ...f, longueur: e.target.value }))}
                  placeholder="600"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="carton-largeur" className="text-xs">Largeur (mm)</Label>
                <Input
                  id="carton-largeur"
                  type="number"
                  min={0}
                  value={form.largeur}
                  onChange={(e) => setForm((f) => ({ ...f, largeur: e.target.value }))}
                  placeholder="400"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="carton-hauteur" className="text-xs">Hauteur (mm)</Label>
                <Input
                  id="carton-hauteur"
                  type="number"
                  min={0}
                  value={form.hauteur}
                  onChange={(e) => setForm((f) => ({ ...f, hauteur: e.target.value }))}
                  placeholder="300"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={isMutating}>Annuler</Button>
            <Button onClick={handleSubmit} disabled={isMutating}>
              {isMutating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Enregistrement...
                </>
              ) : editing ? (
                "Modifier"
              ) : (
                "Créer"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
        onConfirm={handleDelete}
        title="Supprimer le type de carton ?"
        description={`Êtes-vous sûr de vouloir supprimer le type de carton "${deleteTarget?.nom ?? ""}" ? Cette action est irréversible.`}
        isLoading={remove.isPending}
      />
    </div>
  )
}