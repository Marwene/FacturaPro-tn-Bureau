"use client"

import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, Maximize2, Undo2, Redo2, Grid3X3 } from "lucide-react";
import type { CanvasView } from "@/lib/customizer/types/product-customizer";
import type { MockupViewConfig } from "@/lib/customizer/mockups/product-mockups";

interface DesignCanvasToolbarProps {
  zoom: number;
  setZoom: (zoom: number) => void;
  views: MockupViewConfig[];
  currentView: CanvasView;
  setCurrentView: (view: CanvasView) => void;
}

export function DesignCanvasToolbar({
  zoom,
  setZoom,
  views,
  currentView,
  setCurrentView,
}: DesignCanvasToolbarProps) {
  return (
    <div className="flex items-center justify-between border-b px-3 py-1.5">
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(zoom * 1.2)}>
          <ZoomIn className="h-3.5 w-3.5" />
        </Button>
        <span className="w-12 text-center text-xs tabular-nums">{Math.round(zoom * 100)}%</span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(zoom / 1.2)}>
          <ZoomOut className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(1)}>
          <Maximize2 className="h-3.5 w-3.5" />
        </Button>
        <div className="mx-2 h-4 w-px bg-border" />
        <Button variant="ghost" size="icon" className="h-7 w-7">
          <Grid3X3 className="h-3.5 w-3.5" />
        </Button>
        <div className="mx-2 h-4 w-px bg-border" />
        <div className="flex items-center gap-0.5 rounded-md bg-muted p-0.5">
          {views.map((v) => (
            <button
              key={v.view}
              type="button"
              onClick={() => setCurrentView(v.view)}
              className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                currentView === v.view
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-7 w-7">
          <Undo2 className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7">
          <Redo2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
