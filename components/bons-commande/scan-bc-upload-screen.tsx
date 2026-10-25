"use client"

import type { RefObject } from "react"
import { Upload, PenLine } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface Props {
  fileInputRef: RefObject<HTMLInputElement | null>
  dragOver: boolean
  onDragOver: (v: boolean) => void
  onDrop: (e: React.DragEvent) => void
  onFileInput: (e: React.ChangeEvent<HTMLInputElement>) => void
  onClickUpload: () => void
  onShowManual: () => void
}

export function ScanBCUploadScreen({
  fileInputRef, dragOver, onDragOver, onDrop, onFileInput, onClickUpload, onShowManual,
}: Props) {
  return (
    <>
      <div
        className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer ${
          dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
        }`}
        onDragOver={(e) => { e.preventDefault(); onDragOver(true) }}
        onDragLeave={() => onDragOver(false)}
        onDrop={onDrop}
        onClick={onClickUpload}
      >
        <input ref={fileInputRef} type="file" accept=".pdf,image/*" onChange={onFileInput} className="hidden" />
        <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-medium mb-2">Déposez le PDF ou la photo ici</h3>
        <p className="text-sm text-muted-foreground mb-4">ou cliquez pour parcourir</p>
        <Badge variant="secondary" className="text-xs">PDF, PNG, JPG jusqu&apos;à 20 Mo</Badge>
      </div>
      <div className="flex py-2 items-center justify-center">
        <Button variant="link" size="sm" onClick={onShowManual} className="text-muted-foreground">
          <PenLine className="h-4 w-4 mr-2" />
          Saisie manuelle (cas extrême)
        </Button>
      </div>
    </>
  )
}
