"use client";

import { useRef, useState } from "react";
import { useLayerStore } from "@/lib/customizer/stores/layer-store";
import { useUploadStore } from "@/lib/customizer/stores/upload-store";
import { useCanvasStore } from "@/lib/customizer/stores/canvas-store";
import { Button } from "@/components/ui/button";
import { Upload, Image, FileWarning, Loader2 } from "lucide-react";
import type { DesignLayer, ImageLayerData } from "@/lib/customizer/types/product-customizer";

export function UploadPanel() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addLayer = useLayerStore((s) => s.addLayer);
  const addAsset = useUploadStore((s) => s.addAsset);
  const isUploading = useUploadStore((s) => s.isUploading);
  const setUploading = useUploadStore((s) => s.setUploading);
  const currentView = useCanvasStore((s) => s.currentView);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  function handleFile(file: File) {
    setError(null);

    if (!file.type.startsWith("image/")) {
      setError("Format non supporté. Utilisez PNG, JPG ou SVG.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("Fichier trop volumineux (max 10 Mo).");
      return;
    }

    setUploading(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;

      const img = new window.Image();
      img.onload = () => {
        const imageData: ImageLayerData = {
          src: dataUrl,
          originalWidth: img.width,
          originalHeight: img.height,
        };

        const maxW = 300;
        const maxH = 300;
        let w = img.width;
        let h = img.height;
        if (w > maxW || h > maxH) {
          const ratio = Math.min(maxW / w, maxH / h);
          w *= ratio;
          h *= ratio;
        }

        const layer: DesignLayer = {
          id: crypto.randomUUID(),
          type: "logo",
          name: file.name.length > 25 ? `${file.name.substring(0, 22)}...` : file.name,
          position: { x: 80, y: 80 },
          size: { width: w, height: h },
          rotation: 0,
          opacity: 1,
          visible: true,
          locked: false,
          zIndex: Date.now(),
          blendMode: "normal",
          view: currentView,
          data: imageData,
        };

        addLayer(layer);

        addAsset({
          id: layer.id,
          name: file.name,
          url: dataUrl,
          type: "logo",
          width: img.width,
          height: img.height,
          fileSize: file.size,
          uploadedAt: new Date().toISOString(),
        });

        setUploading(false);
      };

      img.onerror = () => {
        setError("Impossible de charger l'image.");
        setUploading(false);
      };

      img.src = dataUrl;
    };

    reader.onerror = () => {
      setError("Erreur de lecture du fichier.");
      setUploading(false);
    };

    reader.readAsDataURL(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="space-y-3">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors ${
          isDragOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50"
        }`}
        onClick={() => fileInputRef.current?.click()}
      >
        {isUploading ? (
          <Loader2 className="mb-2 h-6 w-6 animate-spin text-muted-foreground" />
        ) : (
          <Upload className="mb-2 h-6 w-6 text-muted-foreground" />
        )}
        <p className="text-xs text-muted-foreground">
          {isUploading
            ? "Chargement..."
            : "Déposez un fichier ou cliquez"}
        </p>
        <p className="mt-0.5 text-[10px] text-muted-foreground/60">
          PNG, JPG ou SVG — max 10 Mo
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/svg+xml"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {error && (
        <div className="flex items-center gap-1.5 rounded-md bg-destructive/10 p-2 text-xs text-destructive">
          <FileWarning className="h-3.5 w-3.5 shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}
