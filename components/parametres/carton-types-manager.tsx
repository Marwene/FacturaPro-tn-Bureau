"use client"

import { useState } from "react"
import { DataTable } from "@/components/data-table"
import {
  useCartonTypes,
  useCreateCartonType,
  useUpdateCartonType,
  useDeleteCartonType,
  type CartonType,
} from "@/hooks/use-carton-types"
import { Button } from "@/components/ui/button"
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog"
import { cartonTypeColumns } from "./carton-type-columns"
import { CartonTypeFormDialog } from "./carton-type-form-dialog"
import {
  defaultCartonTypeForm,
  cartonTypeToForm,
  parseCartonTypeForm,
  type CartonTypeForm,
} from "@/lib/carton-type-form"
import { notify } from "@/lib/notify"
import { Boxes, Plus } from "lucide-react"

export function CartonTypesManager() {
  const { data, isLoading, isFetching } = useCartonTypes()
  const create = useCreateCartonType()
  const update = useUpdateCartonType()
  const remove = useDeleteCartonType()

  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<CartonType | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CartonType | null>(null)
  const [form, setForm] = useState<CartonTypeForm>(defaultCartonTypeForm)

  const cartonTypes = data?.cartonTypes ?? []
  const isMutating = create.isPending || update.isPending

  function openCreate() {
    setEditing(null)
    setForm(defaultCartonTypeForm)
    setDialogOpen(true)
  }

  function openEdit(item: CartonType) {
    setEditing(item)
    setForm(cartonTypeToForm(item))
    setDialogOpen(true)
  }

  function closeDialog() {
    setDialogOpen(false)
    setEditing(null)
  }

  function handleSubmit() {
    const result = parseCartonTypeForm(form)
    if (!result.ok) {
      notify.warning({ title: result.error.title, description: result.error.description })
      return
    }
    const { payload } = result
    const nom = payload.nom

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
        columns={cartonTypeColumns({ onEdit: openEdit, onDelete: setDeleteTarget })}
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

      <CartonTypeFormDialog
        open={dialogOpen}
        editing={editing}
        form={form}
        onFormChange={setForm}
        onClose={closeDialog}
        onSubmit={handleSubmit}
        isMutating={isMutating}
      />

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
