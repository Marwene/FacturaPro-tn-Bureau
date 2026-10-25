"use client";

import { useRef, useState } from "react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { DesignCanvas } from "@/components/customizer/canvas/design-canvas";
import { ProductSelector } from "@/components/customizer/left-panel/product-selector";
import { ColorPanel } from "@/components/customizer/left-panel/color-panel";
import { TextPanel } from "@/components/customizer/left-panel/text-panel";
import { UploadPanel } from "@/components/customizer/left-panel/upload-panel";
import { EmbroideryPanel } from "@/components/customizer/left-panel/embroidery-panel";
import { LayersPanel } from "@/components/customizer/left-panel/layers-panel";
import { PropertiesPanel } from "@/components/customizer/right-panel/properties-panel";
import { useCanvasKeyboardShortcuts } from "@/hooks/customizer/use-canvas-events";
import { useProductStore } from "@/lib/customizer/stores/product-store";
import { useLayerStore } from "@/lib/customizer/stores/layer-store";
import { useCanvasStore } from "@/lib/customizer/stores/canvas-store";
import {
  detectProductType,
  getViewConfig,
} from "@/lib/customizer/mockups/product-mockups";
import type { DesignCanvasHandle } from "@/components/customizer/canvas/design-canvas";
import dynamic from "next/dynamic";

const Mockup3DPreview = dynamic(
  () => import("@/components/customizer/mockup/mockup-3d").then((mod) => mod.Mockup3DPreview),
  {
    loading: () => (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        <div className="relative h-[80vh] w-[80vw] overflow-hidden rounded-xl border bg-card shadow-2xl flex items-center justify-center">
          <div className="h-64 w-64 bg-muted animate-pulse rounded-lg" />
        </div>
      </div>
    ),
    ssr: false,
  }
);
import { ExportDialog } from "@/components/customizer/export/export-dialog";
import { exportAllAndDownload, exportToPNG, exportToSVG, generateProductionPDF, downloadProductionPDF } from "@/lib/customizer/export/production-export";
import type { ExportOptions } from "@/lib/customizer/export/production-export";
import { Button } from "@/components/ui/button";
import { Download, Box, Monitor, Smartphone, Save, FlaskConical } from "lucide-react";
import { useDesignPersonnaliseMutations } from "@/hooks/use-designs-personnalises";
import { useCustomizerProductInit, useCustomizerDesignInit } from "@/hooks/use-customizer-init";
import { NouveauOFDialog } from "@/components/atelier/nouveau-of-dialog";

interface CustomizerStudioProps {
  productId: string;
  designId?: string;
}

export function CustomizerStudio({ productId, designId }: CustomizerStudioProps) {
  const selectedProduct = useProductStore((s) => s.selectedProduct);
  const selectedColor = useProductStore((s) => s.selectedColor);
  const canvasRef = useRef<DesignCanvasHandle>(null);
  const [show3D, setShow3D] = useState(false);
  const [textureCanvas, setTextureCanvas] = useState<HTMLCanvasElement | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [showNewOF, setShowNewOF] = useState(false);
  const [lastSavedDesignId, setLastSavedDesignId] = useState<string | null>(null);
  const { saveDesign, updateDesign } = useDesignPersonnaliseMutations();

  useCustomizerProductInit(productId);
  const designQuery = useCustomizerDesignInit(designId);

  const savedDesignId = designQuery.data?.id ?? lastSavedDesignId;

  useCanvasKeyboardShortcuts();

  function handleOpen3D() {
    const snapshot = canvasRef.current?.getCanvasSnapshot();
    if (snapshot) {
      setTextureCanvas(snapshot);
      setShow3D(true);
    }
  }

  async function handleSaveDesign() {
    if (!selectedProduct) return
    const snapshot = canvasRef.current?.getCanvasSnapshot()
    const thumbnail = snapshot ? snapshot.toDataURL("image/png", 0.5) : null
    const layers = useLayerStore.getState().layers
    try {
      if (savedDesignId) {
        const result = await updateDesign.mutateAsync({
          id: savedDesignId,
          data: { layers, thumbnail },
        })
        setLastSavedDesignId(result.design.id)
      } else {
        const result = await saveDesign.mutateAsync({
          productId: selectedProduct.id,
          nom: `Design - ${selectedProduct.nom} - ${new Date().toLocaleDateString("fr-FR")}`,
          layers,
          thumbnail,
        })
        setLastSavedDesignId(result.design.id)
      }
    } catch (e) {
      console.error("Erreur sauvegarde design", e)
    }
  }

  async function handleExport(format: "png" | "svg" | "sheet" | "all") {
    const snapshot = canvasRef.current?.getCanvasSnapshot();
    if (!snapshot || !selectedProduct) return;

    const exportOptions: ExportOptions = {
      productName: selectedProduct.nom,
      productType,
      productCode: selectedProduct.code,
      color: selectedColor,
      size: useProductStore.getState().selectedSize,
      layers: useLayerStore.getState().layers,
      canvasWidth: 400,
      canvasHeight: 500,
      view: useCanvasStore.getState().currentView,
      clientName: selectedProduct.tiersName ?? undefined,
    };

    switch (format) {
      case "png": {
        const blob = await exportToPNG(snapshot, `${selectedProduct.nom}.png`);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${selectedProduct.nom}.png`;
        a.click();
        URL.revokeObjectURL(url);
        break;
      }
      case "svg": {
        const svg = exportToSVG(exportOptions);
        const blob = new Blob([svg], { type: "image/svg+xml" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${selectedProduct.nom}.svg`;
        a.click();
        URL.revokeObjectURL(url);
        break;
      }
      case "sheet": {
        const currentView = useCanvasStore.getState().currentView
        const backSupported = getViewConfig(productType ?? "t-shirt", "back") !== undefined

        // Capture front view
        useCanvasStore.getState().setCurrentView("front")
        await new Promise((r) => requestAnimationFrame(r))
        await new Promise((r) => setTimeout(r, 150))
        const frontSnapshot = canvasRef.current?.getCanvasSnapshot()

        // Capture back view
        let backSnapshot: HTMLCanvasElement | null = null
        if (backSupported) {
          useCanvasStore.getState().setCurrentView("back")
          await new Promise((r) => requestAnimationFrame(r))
          await new Promise((r) => setTimeout(r, 150))
          backSnapshot = canvasRef.current?.getCanvasSnapshot() ?? null
        }

        // Restore original view
        useCanvasStore.getState().setCurrentView(currentView)

        const pdfBlob = await generateProductionPDF({
          ...exportOptions,
          snapshotFront: frontSnapshot,
          snapshotBack: backSnapshot,
        })
        downloadProductionPDF(pdfBlob, `fiche-${selectedProduct.nom}.pdf`)
        break;
      }
      case "all": {
        await exportAllAndDownload(snapshot, exportOptions);
        break;
      }
    }
  }

  const productType = selectedProduct
    ? detectProductType(selectedProduct.nom, selectedProduct.categorie?.nom)
    : undefined;

  const productImageUrl = selectedProduct?.photoUrl;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-medium">
            Studio de personnalisation
          </h1>
          {selectedProduct && (
            <span className="text-xs text-muted-foreground">
              — {selectedProduct.nom}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border p-0.5">
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Monitor className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Smartphone className="h-3.5 w-3.5" />
            </Button>
          </div>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={handleOpen3D}>
            <Box className="h-3.5 w-3.5" />
            3D
          </Button>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={handleSaveDesign} disabled={saveDesign.isPending || !selectedProduct}>
            <Save className="h-3.5 w-3.5" />
            {saveDesign.isPending ? "Sauvegarde..." : savedDesignId ? "Sauvegardé" : "Sauvegarder"}
          </Button>
          {savedDesignId && (
            <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setShowNewOF(true)}>
              <FlaskConical className="h-3.5 w-3.5" />
              Créer un OF
            </Button>
          )}
          <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setShowExport(true)}>
            <Download className="h-3.5 w-3.5" />
            Exporter
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-[280px] shrink-0 overflow-hidden border-r">
          <ScrollArea className="h-full p-3">
            <div className="space-y-4">
              <ProductSelector onSelectProduct={() => { }} />
              <Separator />
              <ColorPanel />
              <Separator />
              <TextPanel />
              <Separator />
              <UploadPanel />
              <Separator />
              <EmbroideryPanel />
            </div>
          </ScrollArea>
        </aside>

        <main className="flex-1 overflow-hidden">
          <DesignCanvas ref={canvasRef} productType={productType} productImageUrl={productImageUrl} />
        </main>

        <aside className="flex w-[360px] shrink-0 flex-col overflow-hidden border-l">
          <div className="h-[45%] overflow-hidden border-b p-3">
            <LayersPanel />
          </div>
          <div className="flex-1 overflow-hidden">
            <PropertiesPanel />
          </div>
        </aside>
      </div>

      <ExportDialog
        open={showExport}
        onOpenChange={setShowExport}
        onExport={handleExport}
        options={{
          productName: selectedProduct?.nom ?? "Produit",
          productType,
          productCode: selectedProduct?.code ?? "",
          color: selectedColor,
          size: "M",
          layers: useLayerStore.getState().layers,
          canvasWidth: 400,
          canvasHeight: 500,
          view: useCanvasStore.getState().currentView,
        }}
      />

      {show3D && textureCanvas && (
        <Mockup3DPreview
          productType={productType}
          textureCanvas={textureCanvas}
          color={selectedColor}
          onClose={() => {
            setShow3D(false);
            setTextureCanvas(null);
          }}
        />
      )}

      <NouveauOFDialog
        open={showNewOF}
        onOpenChange={setShowNewOF}
        preselectedProductId={selectedProduct?.id}
        preselectedDesignId={savedDesignId ?? undefined}
      />
    </div>
  );
}
