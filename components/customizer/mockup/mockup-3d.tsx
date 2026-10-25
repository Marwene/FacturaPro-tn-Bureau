"use client";

import { Suspense, useRef, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import * as THREE from "three";
import { getThreeModel } from "@/lib/customizer/mockups/three-models";
import type { ProductType } from "@/lib/customizer/types/product-customizer";
import { Button } from "@/components/ui/button";
import { X, RotateCcw } from "lucide-react";

interface Mockup3DProps {
  productType?: ProductType;
  textureCanvas: HTMLCanvasElement | null;
  color: string;
  onClose?: () => void;
}

function Scene({
  productType,
  textureCanvas,
  color,
}: {
  productType?: ProductType;
  textureCanvas: HTMLCanvasElement | null;
  color: string;
}) {
  const controlsRef = useRef<React.ComponentRef<typeof OrbitControls> | null>(null);
  const groupRef = useRef<THREE.Group>(null);
  const textureRef = useRef<THREE.CanvasTexture | null>(null);

  if (textureCanvas && !textureRef.current) {
    textureRef.current = new THREE.CanvasTexture(textureCanvas);
    textureRef.current.needsUpdate = true;
  }

  if (textureCanvas && textureRef.current) {
    textureRef.current.needsUpdate = true;
  }

  // Justification useEffect : ressource three.js (THREE.CanvasTexture) — dispose() de la texture WebGL à l'unmount pour libérer la mémoire GPU (non réactif : le cycle de vie des objets three.js vit hors React, aucun état ne peut déclencher ce nettoyage au rendu).
  useEffect(() => {
    return () => {
      if (textureRef.current) {
        textureRef.current.dispose();
        textureRef.current = null;
      }
    };
  }, []);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.002;
    }
  });

  const safeType = productType ?? "t-shirt";
  const ModelComponent = getThreeModel(safeType);

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} />
      <directionalLight position={[-3, 3, -3]} intensity={0.3} />
      <pointLight position={[0, 3, 0]} intensity={0.2} />
      <group ref={groupRef} position={[0, -0.2, 0]}>
        <Suspense fallback={null}>
          <ModelComponent
            ref={groupRef}
            texture={textureRef.current}
            color={color}
          />
        </Suspense>
      </group>
      <OrbitControls
        ref={controlsRef}
        enablePan={false}
        minDistance={1.5}
        maxDistance={4}
        autoRotate={false}
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.6, 0]}>
        <planeGeometry args={[4, 4]} />
        <meshStandardMaterial
          color="#f0f0f0"
          roughness={1}
          metalness={0}
        />
      </mesh>
    </>
  );
}

export function Mockup3DPreview({ productType, textureCanvas, color, onClose }: Mockup3DProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="relative h-[80vh] w-[80vw] overflow-hidden rounded-xl border bg-card shadow-2xl">
        <div className="absolute left-4 top-4 z-10 flex items-center gap-2">
          <Button
            variant="secondary"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              const canvas = document.querySelector("canvas");
              if (canvas) {
                const event = new MouseEvent("dblclick", { bubbles: true });
                canvas.dispatchEvent(event);
              }
            }}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
        <div className="absolute right-4 top-4 z-10">
          <Button variant="secondary" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <Canvas
          camera={{ position: [0, 0.5, 2.5], fov: 40 }}
          gl={{ antialias: true, alpha: false }}
          style={{ background: "#f8f8f8" }}
        >
          <Suspense fallback={null}>
            <Scene
              productType={productType}
              textureCanvas={textureCanvas}
              color={color}
            />
          </Suspense>
        </Canvas>
      </div>
    </div>
  );
}
