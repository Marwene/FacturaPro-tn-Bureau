"use client";

import { useState } from "react";
import { useLayerStore } from "@/lib/customizer/stores/layer-store";
import { useCanvasStore } from "@/lib/customizer/stores/canvas-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sticker, Info, AlertTriangle } from "lucide-react";
import {
  DMC_THREADS,
  EMBROIDERY_POSITIONS,
  STITCH_TYPES,
  getStitchDensityLabel,
} from "@/lib/customizer/embroidery/thread-colors";
import {
  estimateStitchCount,
  estimateThreadLength,
  validateEmbroidery,
  EMBROIDERY_CONSTRAINTS,
} from "@/lib/customizer/embroidery/stitch-engine";
import type { DesignLayer, EmbroideryLayerData } from "@/lib/customizer/types/product-customizer";

export function EmbroideryPanel() {
  const addLayer = useLayerStore((s) => s.addLayer);
  const currentView = useCanvasStore((s) => s.currentView);
  const [position, setPosition] = useState("chest-left");
  const [threadCode, setThreadCode] = useState("DMC-310");
  const [stitchType, setStitchType] = useState<"satin" | "fill" | "run" | "tatami" | "bean">("satin");
  const [density, setDensity] = useState(EMBROIDERY_CONSTRAINTS.defaultDensity);
  const [underlay, setUnderlay] = useState(true);
  const [minThickness, setMinThickness] = useState(3);

  const selectedThread = DMC_THREADS.find((t) => t.code === threadCode);
  const defaultW = 60;
  const defaultH = 40;
  const stitchCount = estimateStitchCount(defaultW, defaultH, density, stitchType);
  const threadLength = estimateThreadLength(stitchCount);
  const validation = validateEmbroidery(defaultW, defaultH, density, stitchType, minThickness);

  function handleAddEmbroidery() {
    const embroideryData: EmbroideryLayerData = {
      threadColor: selectedThread?.hex ?? "#000000",
      threadBrand: selectedThread?.brand ?? "DMC",
      threadCode,
      stitchType,
      stitchDensity: density,
      underlay,
      estimatedStitchCount: stitchCount,
      minLineThickness: minThickness,
    };

    const basePosition = EMBROIDERY_POSITIONS.find((p) => p.id === position);
    const positionOffsets: Record<string, { x: number; y: number }> = {
      "chest-left": { x: 80, y: 140 },
      "chest-right": { x: 260, y: 140 },
      "chest-center": { x: 150, y: 140 },
      "sleeve-left": { x: 30, y: 180 },
      "sleeve-right": { x: 310, y: 180 },
      "back-center": { x: 150, y: 160 },
      "back-collar": { x: 150, y: 40 },
      "hat-front": { x: 120, y: 70 },
      "hat-back": { x: 120, y: 160 },
      "apron-center": { x: 80, y: 100 },
    };
    const off = positionOffsets[position] ?? { x: 100, y: 100 };

    const layer: DesignLayer = {
      id: crypto.randomUUID(),
      type: "embroidery",
      name: `Broderie - ${basePosition?.label ?? position}`,
      position: off,
      size: { width: defaultW, height: defaultH },
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
      zIndex: Date.now(),
      blendMode: "normal",
      view: currentView,
      data: embroideryData,
    };

    addLayer(layer);
  }

  return (
    <div className="space-y-3">
      <Label className="text-xs font-medium text-muted-foreground">
        <Sticker className="mr-1 inline h-3 w-3" />
        Broderie
      </Label>

      <div>
        <Label className="text-xs text-muted-foreground">Position</Label>
        <select
          value={position}
          onChange={(e) => setPosition(e.target.value)}
          className="mt-1 flex h-8 w-full rounded-md border border-input bg-transparent px-2 text-xs"
        >
          {EMBROIDERY_POSITIONS.map((p) => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
        </select>
      </div>

      <div>
        <Label className="text-xs text-muted-foreground">Couleur du fil</Label>
        <div className="mt-1 grid grid-cols-6 gap-1">
          {DMC_THREADS.map((t) => (
            <button
              key={t.code}
              type="button"
              onClick={() => setThreadCode(t.code)}
              className={`h-6 w-full rounded border transition-all ${
                threadCode === t.code ? "ring-2 ring-primary ring-offset-1" : ""
              }`}
              style={{ backgroundColor: t.hex }}
              title={`${t.code} - ${t.name}`}
            />
          ))}
        </div>
        {selectedThread && (
          <p className="mt-1 text-[10px] text-muted-foreground">
            {selectedThread.code} — {selectedThread.name}
          </p>
        )}
      </div>

      <div>
        <Label className="text-xs text-muted-foreground">Type de point</Label>
        <div className="mt-1 flex flex-wrap gap-1">
          {STITCH_TYPES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStitchType(s.id)}
              className={`rounded px-2 py-1 text-[10px] transition-colors ${
                stitchType === s.id
                  ? "bg-accent text-accent-foreground"
                  : "border border-input hover:bg-muted"
              }`}
              title={s.description}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-xs text-muted-foreground">
          Densité : {getStitchDensityLabel(density)} ({density}/10)
        </Label>
        <input
          type="range"
          min={EMBROIDERY_CONSTRAINTS.minDensity}
          max={EMBROIDERY_CONSTRAINTS.maxDensity}
          value={density}
          onChange={(e) => setDensity(Number(e.target.value))}
          className="mt-1 h-1.5 w-full cursor-pointer appearance-none rounded bg-muted-foreground/20 accent-primary"
        />
        <div className="mt-0.5 flex justify-between text-[10px] text-muted-foreground">
          <span>Léger</span>
          <span>Dense</span>
        </div>
      </div>

      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={underlay}
          onChange={(e) => setUnderlay(e.target.checked)}
          className="h-3.5 w-3.5 rounded border-gray-300 accent-primary"
        />
        Sous-couche (underlay)
      </label>

      <div>
        <Label className="text-xs text-muted-foreground">Épaisseur mini (mm)</Label>
        <Input
          type="number"
          value={minThickness}
          min={1}
          max={10}
          onChange={(e) => setMinThickness(Number(e.target.value))}
          className="mt-1 h-8 text-xs"
        />
      </div>

      <div className="space-y-1 rounded-md bg-muted/50 p-2">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Info className="h-3 w-3" />
          Estimation
        </div>
        <p className="text-xs">
          <span className="text-muted-foreground">Points : </span>
          <span className="font-medium">{stitchCount.toLocaleString()}</span>
        </p>
        <p className="text-xs">
          <span className="text-muted-foreground">Fil : </span>
          <span className="font-medium">{threadLength.toFixed(1)} m</span>
        </p>
      </div>

      {validation.warnings.length > 0 && (
        <div className="space-y-1 rounded-md bg-amber-50 p-2 dark:bg-amber-950/30">
          {validation.warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-1 text-[11px] text-amber-700 dark:text-amber-400">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
              {w}
            </div>
          ))}
        </div>
      )}

      <Button onClick={handleAddEmbroidery} className="w-full gap-1.5 text-xs" size="sm">
        <Sticker className="h-3.5 w-3.5" />
        Ajouter la broderie
      </Button>
    </div>
  );
}
