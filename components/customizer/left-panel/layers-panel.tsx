"use client";

import { useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useLayerStore } from "@/lib/customizer/stores/layer-store";
import { useCanvasStore } from "@/lib/customizer/stores/canvas-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Layers,
  Eye,
  EyeOff,
  Lock,
  LockOpen,
  Trash2,
  Copy,
  GripVertical,
  Type,
  Image,
  Sticker,
  Shirt,
} from "lucide-react";
import type { LayerType } from "@/lib/customizer/types/product-customizer";

function viewLabel(view: string): string {
  switch (view) {
    case "front": return "AV";
    case "back": return "AR";
    case "left-sleeve": return "MG";
    case "right-sleeve": return "MD";
    case "hood": return "CAP";
    case "pocket": return "POC";
    default: return view.slice(0, 2).toUpperCase();
  }
}

function LayerIcon({ type }: { type: LayerType }) {
  switch (type) {
    case "text":
      return <Type className="h-3.5 w-3.5" />;
    case "image":
    case "logo":
      return <Image className="h-3.5 w-3.5" />;
    case "embroidery":
      return <Sticker className="h-3.5 w-3.5" />;
    case "product":
      return <Shirt className="h-3.5 w-3.5" />;
  }
}

function SortableLayer({ layerId }: { layerId: string }) {
  const layer = useLayerStore((s) => s.layers.find((l) => l.id === layerId));
  const activeLayerId = useLayerStore((s) => s.activeLayerId);
  const setActiveLayer = useLayerStore((s) => s.setActiveLayer);
  const toggleLayerVisibility = useLayerStore((s) => s.toggleLayerVisibility);
  const toggleLayerLock = useLayerStore((s) => s.toggleLayerLock);
  const removeLayer = useLayerStore((s) => s.removeLayer);
  const duplicateLayer = useLayerStore((s) => s.duplicateLayer);
  const selectedLayerIds = useCanvasStore((s) => s.selectedLayerIds);
  const toggleLayerSelection = useCanvasStore((s) => s.toggleLayerSelection);
  const [isRenaming, setIsRenaming] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: layerId });

  if (!layer) return null;

  const isSelected = activeLayerId === layerId || selectedLayerIds.includes(layerId);

  function handleClick(e: React.MouseEvent) {
    if (e.shiftKey) {
      toggleLayerSelection(layerId);
    } else {
      setActiveLayer(layerId);
    }
  }

  function handleDoubleClick() {
    setIsRenaming(true);
  }

  function handleRename(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      setIsRenaming(false);
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm transition-colors",
        isDragging && "opacity-50 shadow-lg",
        isSelected
          ? "bg-accent text-accent-foreground"
          : "hover:bg-muted/50",
        !layer.visible && "opacity-50",
      )}
    >
      <button
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>

      <button
        onClick={() => toggleLayerVisibility(layerId)}
        className="text-muted-foreground hover:text-foreground"
      >
        {layer.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
      </button>

      <div
        className="flex flex-1 items-center gap-1.5 overflow-hidden"
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
      >
        <LayerIcon type={layer.type} />
        {isRenaming ? (
          <Input
            defaultValue={layer.name}
            className="h-5 text-xs px-1 py-0"
            autoFocus
            onBlur={() => setIsRenaming(false)}
            onKeyDown={handleRename}
          />
        ) : (
          <span className="truncate text-xs">{layer.name}</span>
        )}
        {layer.view && (
          <span className="shrink-0 rounded-sm border px-1 text-[9px] uppercase text-muted-foreground/60">
            {viewLabel(layer.view)}
          </span>
        )}
      </div>

      <button
        onClick={() => toggleLayerLock(layerId)}
        className="text-muted-foreground hover:text-foreground"
      >
        {layer.locked ? <Lock className="h-3.5 w-3.5" /> : <LockOpen className="h-3.5 w-3.5" />}
      </button>

      <div className="hidden gap-0.5 group-hover:flex">
        <button
          onClick={() => duplicateLayer(layerId)}
          className="text-muted-foreground hover:text-foreground"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => removeLayer(layerId)}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export function LayersPanel() {
  const layers = useLayerStore((s) => s.layers);
  const reorderLayer = useLayerStore((s) => s.reorderLayer);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const fromIndex = layers.findIndex((l) => l.id === active.id);
    const toIndex = layers.findIndex((l) => l.id === over.id);
    if (fromIndex !== -1 && toIndex !== -1) {
      reorderLayer(fromIndex, toIndex);
    }
  }

  const sortedLayers = [...layers].sort((a, b) => a.zIndex - b.zIndex);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Layers className="h-3.5 w-3.5" />
        Calques
        <span className="ml-auto text-xs text-muted-foreground/60">
          {layers.length}
        </span>
      </div>
      {layers.length === 0 ? (
        <p className="py-8 text-center text-xs text-muted-foreground">
          Aucun calque. Ajoutez du texte ou une image pour commencer.
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sortedLayers.map((l) => l.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-0.5">
              {sortedLayers.map((layer) => (
                <SortableLayer key={layer.id} layerId={layer.id} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
