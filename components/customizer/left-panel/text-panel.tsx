"use client";

import { useState } from "react";
import { useLayerStore } from "@/lib/customizer/stores/layer-store";
import { useCanvasStore } from "@/lib/customizer/stores/canvas-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Type, Bold, Italic, AlignLeft, AlignCenter, AlignRight } from "lucide-react";
import type { DesignLayer, TextLayerData } from "@/lib/customizer/types/product-customizer";

const FONTS = [
  "Arial", "Helvetica", "Times New Roman", "Courier New",
  "Verdana", "Georgia", "Palatino", "Impact",
];

const FONT_SIZES = [8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 60, 72];

export function TextPanel() {
  const addLayer = useLayerStore((s) => s.addLayer);
  const currentView = useCanvasStore((s) => s.currentView);
  const [text, setText] = useState("Texte");
  const [fontFamily, setFontFamily] = useState("Arial");
  const [fontSize, setFontSize] = useState(24);
  const [fontWeight, setFontWeight] = useState(400);
  const [fontStyle, setFontStyle] = useState<"normal" | "italic">("normal");
  const [textAlign, setTextAlign] = useState<"left" | "center" | "right">("center");
  const [color, setColor] = useState("#000000");

  function handleAddText() {
    const textData: TextLayerData = {
      text,
      fontFamily,
      fontSize,
      fontWeight,
      fontStyle,
      letterSpacing: 0,
      lineHeight: 1.2,
      textAlign,
      color,
    };

    const layer: DesignLayer = {
      id: crypto.randomUUID(),
      type: "text",
      name: text.length > 20 ? `${text.substring(0, 20)}...` : text,
      position: { x: 100, y: 100 },
      size: { width: 200, height: fontSize * 1.5 },
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
      zIndex: Date.now(),
      blendMode: "normal",
      view: currentView,
      data: textData,
    };

    addLayer(layer);
  }

  return (
    <div className="space-y-3">
      <Label className="text-xs font-medium text-muted-foreground">
        <Type className="mr-1 inline h-3 w-3" />
        Texte
      </Label>

      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Saisissez votre texte"
        className="h-8 text-sm"
      />

      <div>
        <Label className="text-xs text-muted-foreground">Police</Label>
        <select
          value={fontFamily}
          onChange={(e) => setFontFamily(e.target.value)}
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
          <select
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            className="mt-1 flex h-8 w-full rounded-md border border-input bg-transparent px-2 text-xs"
          >
            {FONT_SIZES.map((s) => (
              <option key={s} value={s}>{s}px</option>
            ))}
          </select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Couleur</Label>
          <Input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="mt-1 h-8 cursor-pointer p-0.5"
          />
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setFontWeight(fontWeight === 700 ? 400 : 700)}
          className={`flex h-7 w-7 items-center justify-center rounded text-xs ${
            fontWeight === 700 ? "bg-accent text-accent-foreground" : "hover:bg-muted"
          }`}
          title="Gras"
        >
          <Bold className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setFontStyle(fontStyle === "italic" ? "normal" : "italic")}
          className={`flex h-7 w-7 items-center justify-center rounded text-xs ${
            fontStyle === "italic" ? "bg-accent text-accent-foreground" : "hover:bg-muted"
          }`}
          title="Italique"
        >
          <Italic className="h-3.5 w-3.5" />
        </button>
        <div className="mx-1 h-4 w-px bg-border" />
        <button
          type="button"
          onClick={() => setTextAlign("left")}
          className={`flex h-7 w-7 items-center justify-center rounded text-xs ${
            textAlign === "left" ? "bg-accent text-accent-foreground" : "hover:bg-muted"
          }`}
          title="Aligné à gauche"
        >
          <AlignLeft className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setTextAlign("center")}
          className={`flex h-7 w-7 items-center justify-center rounded text-xs ${
            textAlign === "center" ? "bg-accent text-accent-foreground" : "hover:bg-muted"
          }`}
          title="Centré"
        >
          <AlignCenter className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setTextAlign("right")}
          className={`flex h-7 w-7 items-center justify-center rounded text-xs ${
            textAlign === "right" ? "bg-accent text-accent-foreground" : "hover:bg-muted"
          }`}
          title="Aligné à droite"
        >
          <AlignRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <Button onClick={handleAddText} className="w-full gap-1.5 text-xs" size="sm">
        <Type className="h-3.5 w-3.5" />
        Ajouter le texte
      </Button>
    </div>
  );
}
