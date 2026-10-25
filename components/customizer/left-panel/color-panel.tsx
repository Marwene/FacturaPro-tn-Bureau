"use client";

import { useState } from "react";
import { useProductStore } from "@/lib/customizer/stores/product-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Palette } from "lucide-react";

const PRESET_COLORS = [
  "#FFFFFF", "#000000", "#CC0000", "#FF6600", "#FFCC00",
  "#006600", "#003399", "#330066", "#663300", "#999999",
  "#FFCCCC", "#CCFFCC", "#CCCCFF", "#FFFFCC", "#CCFFFF",
];

interface ColorPanelProps {
  onColorChange?: (color: string) => void;
}

export function ColorPanel({ onColorChange }: ColorPanelProps) {
  const selectedColor = useProductStore((s) => s.selectedColor);
  const setSelectedColor = useProductStore((s) => s.setSelectedColor);
  const [customColor, setCustomColor] = useState(selectedColor);

  function handleColorChange(color: string) {
    setSelectedColor(color);
    setCustomColor(color);
    onColorChange?.(color);
  }

  return (
    <div className="space-y-3">
      <Label className="text-xs font-medium text-muted-foreground">
        <Palette className="mr-1 inline h-3 w-3" />
        Couleur du produit
      </Label>
      <div className="grid grid-cols-5 gap-1.5">
        {PRESET_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => handleColorChange(color)}
            className={`h-7 w-full rounded-md border transition-all hover:scale-110 ${
              selectedColor === color ? "ring-2 ring-primary ring-offset-1" : ""
            }`}
            style={{ backgroundColor: color }}
            title={color}
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Input
          type="color"
          value={customColor}
          onChange={(e) => handleColorChange(e.target.value)}
          className="h-8 w-10 cursor-pointer p-0.5"
        />
        <Input
          value={customColor}
          onChange={(e) => {
            setCustomColor(e.target.value);
            if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
              handleColorChange(e.target.value);
            }
          }}
          placeholder="#000000"
          className="h-8 flex-1 font-mono text-xs"
        />
      </div>
    </div>
  );
}
