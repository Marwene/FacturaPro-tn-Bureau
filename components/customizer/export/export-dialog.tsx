"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Download, FileImage, FileCode, FileText, Archive } from "lucide-react";
import type { ExportOptions } from "@/lib/customizer/export/production-export";

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (format: "png" | "svg" | "sheet" | "all") => Promise<void>;
  options: ExportOptions;
}

const FORMATS = [
  {
    id: "all" as const,
    label: "Tout le package",
    description: "PNG + SVG + Fiche de production (ZIP)",
    icon: Archive,
    recommended: true,
  },
  {
    id: "png" as const,
    label: "PNG haute résolution",
    description: "Aperçu du design, fond transparent",
    icon: FileImage,
  },
  {
    id: "svg" as const,
    label: "SVG vectoriel",
    description: "Calques vectoriels pour impression",
    icon: FileCode,
  },
  {
    id: "sheet" as const,
    label: "Fiche de production",
    description: "PDF téléchargeable avec photos et spécifications",
    icon: FileText,
  },
];

export function ExportDialog({ open, onOpenChange, onExport, options }: ExportDialogProps) {
  const [format, setFormat] = useState<"all" | "png" | "svg" | "sheet">("all");
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      await onExport(format);
      onOpenChange(false);
    } catch (err) {
      console.error(err);
    } finally {
      setExporting(false);
    }
  }

  const embroideryCount = options.layers.filter((l) => l.type === "embroidery").length;
  const textCount = options.layers.filter((l) => l.type === "text").length;
  const imageCount = options.layers.filter((l) => l.type === "image" || l.type === "logo").length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Exporter le design</DialogTitle>
          <DialogDescription>
            Choisissez le format d'export pour {options.productName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          {FORMATS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFormat(f.id)}
              className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors ${format === f.id
                  ? "border-primary bg-primary/5"
                  : "border-input hover:bg-muted/50"
                }`}
            >
              <f.icon className={`mt-0.5 h-5 w-5 ${format === f.id ? "text-primary" : "text-muted-foreground"}`} />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{f.label}</span>
                  {f.recommended && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                      Recommandé
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{f.description}</p>
              </div>
              <div
                className={`mt-0.5 h-4 w-4 rounded-full border-2 ${format === f.id ? "border-primary bg-primary" : "border-muted-foreground"
                  }`}
              />
            </button>
          ))}
        </div>

        <div className="rounded-md bg-muted/50 p-3">
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div>
              <p className="font-medium text-foreground">{options.layers.length}</p>
              <p className="text-muted-foreground">Calques</p>
            </div>
            <div>
              <p className="font-medium text-foreground">{embroideryCount > 0 ? `${embroideryCount}` : "—"}</p>
              <p className="text-muted-foreground">Broderies</p>
            </div>
            <div>
              <p className="font-medium text-foreground">{textCount + imageCount}</p>
              <p className="text-muted-foreground">Textes + Images</p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={exporting}>
            Annuler
          </Button>
          <Button onClick={handleExport} disabled={exporting} className="gap-1.5">
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {exporting ? "Export en cours..." : "Exporter"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
