"use client";

import { useLayerStore } from "@/lib/customizer/stores/layer-store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Bold, Italic, AlignLeft, AlignCenter, AlignRight } from "lucide-react";
import type { TextLayerData } from "@/lib/customizer/types/product-customizer";

const FONTS = [
  "Arial", "Helvetica", "Times New Roman", "Courier New",
  "Verdana", "Georgia", "Palatino", "Impact",
];

export function PropertiesPanel() {
  const activeLayerId = useLayerStore((s) => s.activeLayerId);
  const layers = useLayerStore((s) => s.layers);
  const updateLayer = useLayerStore((s) => s.updateLayer);

  const found = layers.find((l) => l.id === activeLayerId);

  if (!found) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <p className="text-center text-xs text-muted-foreground">
          Sélectionnez un calque pour voir ses propriétés
        </p>
      </div>
    );
  }

  const activeLayer = found;
  const isText = activeLayer.type === "text";
  const td = isText ? (activeLayer.data as TextLayerData) : null;

  function updatePos(key: "x" | "y", value: number) {
    updateLayer(activeLayer.id, {
      position: { ...activeLayer.position, [key]: value },
    });
  }

  function updateSize(key: "width" | "height", value: number) {
    updateLayer(activeLayer.id, {
      size: { ...activeLayer.size, [key]: Math.max(5, value) },
    });
  }

  function updateTextData(partial: Partial<TextLayerData>) {
    updateLayer(activeLayer.id, {
      data: { ...activeLayer.data, ...partial } as TextLayerData,
    });
  }

  return (
    <ScrollArea className="h-full p-3">
      <div className="space-y-4">
        <div>
          <Label className="text-xs font-medium text-muted-foreground">Nom</Label>
          <Input
            value={activeLayer.name}
            onChange={(e) => updateLayer(activeLayer.id, { name: e.target.value })}
            className="mt-1 h-8 text-sm"
          />
        </div>

        <Separator />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">X</Label>
            <Input
              type="number"
              value={Math.round(activeLayer.position.x)}
              onChange={(e) => updatePos("x", Number(e.target.value))}
              className="mt-1 h-8 text-xs"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Y</Label>
            <Input
              type="number"
              value={Math.round(activeLayer.position.y)}
              onChange={(e) => updatePos("y", Number(e.target.value))}
              className="mt-1 h-8 text-xs"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">W</Label>
            <Input
              type="number"
              value={Math.round(activeLayer.size.width)}
              onChange={(e) => updateSize("width", Number(e.target.value))}
              className="mt-1 h-8 text-xs"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">H</Label>
            <Input
              type="number"
              value={Math.round(activeLayer.size.height)}
              onChange={(e) => updateSize("height", Number(e.target.value))}
              className="mt-1 h-8 text-xs"
            />
          </div>
        </div>

        <div>
          <Label className="text-xs text-muted-foreground">Rotation</Label>
          <Input
            type="number"
            value={Math.round(activeLayer.rotation)}
            onChange={(e) => updateLayer(activeLayer.id, { rotation: Number(e.target.value) })}
            className="mt-1 h-8 text-xs"
          />
        </div>

        <Separator />

        <div>
          <Label className="text-xs text-muted-foreground">
            Opacité {Math.round(activeLayer.opacity * 100)}%
          </Label>
          <Slider
            value={[activeLayer.opacity]}
            min={0}
            max={1}
            step={0.01}
            onValueChange={([v]) => updateLayer(activeLayer.id, { opacity: v })}
            className="mt-1"
          />
        </div>

        {isText && td && (
          <>
            <Separator />

            <div className="space-y-3">
              <Label className="text-xs font-medium text-muted-foreground">Texte</Label>
              <textarea
                value={td.text}
                onChange={(e) => updateTextData({ text: e.target.value })}
                className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-2 py-1 text-xs"
                rows={3}
              />

              <div>
                <Label className="text-xs text-muted-foreground">Police</Label>
                <select
                  value={td.fontFamily}
                  onChange={(e) => updateTextData({ fontFamily: e.target.value })}
                  className="mt-1 flex h-8 w-full rounded-md border border-input bg-transparent px-2 text-xs"
                >
                  {FONTS.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Taille</Label>
                  <Input
                    type="number"
                    value={td.fontSize}
                    onChange={(e) => updateTextData({ fontSize: Number(e.target.value) })}
                    className="mt-1 h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Couleur</Label>
                  <Input
                    type="color"
                    value={td.color}
                    onChange={(e) => updateTextData({ color: e.target.value })}
                    className="mt-1 h-8 cursor-pointer p-0.5"
                  />
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant={td.fontWeight >= 700 ? "secondary" : "ghost"}
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => updateTextData({ fontWeight: td.fontWeight >= 700 ? 400 : 700 })}
                >
                  <Bold className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant={td.fontStyle === "italic" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => updateTextData({ fontStyle: td.fontStyle === "italic" ? "normal" : "italic" })}
                >
                  <Italic className="h-3.5 w-3.5" />
                </Button>
                <div className="mx-1 h-4 w-px bg-border" />
                <Button
                  variant={td.textAlign === "left" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => updateTextData({ textAlign: "left" })}
                >
                  <AlignLeft className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant={td.textAlign === "center" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => updateTextData({ textAlign: "center" })}
                >
                  <AlignCenter className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant={td.textAlign === "right" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => updateTextData({ textAlign: "right" })}
                >
                  <AlignRight className="h-3.5 w-3.5" />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Espacement</Label>
                  <Input
                    type="number"
                    value={td.letterSpacing}
                    step={0.5}
                    onChange={(e) => updateTextData({ letterSpacing: Number(e.target.value) })}
                    className="mt-1 h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Interligne</Label>
                  <Input
                    type="number"
                    value={td.lineHeight}
                    step={0.1}
                    min={0.5}
                    max={3}
                    onChange={(e) => updateTextData({ lineHeight: Number(e.target.value) })}
                    className="mt-1 h-8 text-xs"
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </ScrollArea>
  );
}
