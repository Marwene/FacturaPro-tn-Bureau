"use client"

import { useEffect, useState } from "react";

export function useImageLoader(src: string | null | undefined): HTMLImageElement | null {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  // Justification useEffect : API navigateur HTMLImageElement (new window.Image) — décodage asynchrone de l'image vers l'état via onload/onerror, callbacks externes au React (non réactif : onload survient hors cycle React, impossible à produire pendant un rendu).
  useEffect(() => {
    if (!src) { setImage(null); return }
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setImage(img);
    img.onerror = () => setImage(null);
    img.src = src;
    return () => { img.onload = null; img.onerror = null };
  }, [src]);

  return image;
}
