"use client";

import React, { forwardRef } from "react";
import * as THREE from "three";
import type { ThreeEvent } from "@react-three/fiber";
import type { ProductType } from "../types/product-customizer";

interface ModelProps {
  texture: THREE.CanvasTexture | null;
  color: string;
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
}

export const TShirtModel = forwardRef<THREE.Group, ModelProps>(
  ({ texture, color, onClick }, ref) => (
    <group ref={ref} onClick={onClick}>
      <mesh position={[0, 0.6, 0]}>
        <boxGeometry args={[1.2, 0.8, 0.5]} />
        <meshStandardMaterial
          map={texture}
          color={color}
          metalness={0.05}
          roughness={0.9}
        />
      </mesh>
      <mesh position={[-0.75, 0.4, 0]} rotation={[0, 0, 0.3]}>
        <cylinderGeometry args={[0.15, 0.2, 0.6, 8]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
      <mesh position={[0.75, 0.4, 0]} rotation={[0, 0, -0.3]}>
        <cylinderGeometry args={[0.15, 0.2, 0.6, 8]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.05, 0]}>
        <torusGeometry args={[0.18, 0.06, 8, 12]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
    </group>
  ),
);
TShirtModel.displayName = "TShirtModel";

export const JacketModel = forwardRef<THREE.Group, ModelProps>(
  ({ texture, color, onClick }, ref) => (
    <group ref={ref} onClick={onClick}>
      {texture && (
        <mesh position={[0, 0.6, 0]}>
          <boxGeometry args={[1.3, 0.9, 0.55]} />
          <meshStandardMaterial map={texture} color={color} roughness={0.8} />
        </mesh>
      )}
      {!texture && (
        <mesh position={[0, 0.6, 0]}>
          <boxGeometry args={[1.3, 0.9, 0.55]} />
          <meshStandardMaterial color={color} roughness={0.8} />
        </mesh>
      )}
      <mesh position={[-0.7, 0.8, 0]} rotation={[0, 0, 0.2]}>
        <boxGeometry args={[0.2, 0.05, 0.35]} />
        <meshStandardMaterial color="#444" roughness={0.5} />
      </mesh>
      <mesh position={[0.7, 0.8, 0]} rotation={[0, 0, -0.2]}>
        <boxGeometry args={[0.2, 0.05, 0.35]} />
        <meshStandardMaterial color="#444" roughness={0.5} />
      </mesh>
      <mesh position={[0, -0.05, 0]}>
        <boxGeometry args={[0.8, 0.05, 0.3]} />
        <meshStandardMaterial color="#444" roughness={0.5} />
      </mesh>
      <mesh position={[0, 1.15, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.22, 0.05, 8, 12]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
    </group>
  ),
);
JacketModel.displayName = "JacketModel";

export const HoodieModel = forwardRef<THREE.Group, ModelProps>(
  ({ texture, color, onClick }, ref) => (
    <group ref={ref} onClick={onClick}>
      <mesh position={[0, 0.6, 0]}>
        <boxGeometry args={[1.25, 0.85, 0.55]} />
        <meshStandardMaterial map={texture} color={color} roughness={0.9} />
      </mesh>
      <mesh position={[-0.7, 0.4, 0]} rotation={[0, 0, 0.3]}>
        <cylinderGeometry args={[0.18, 0.22, 0.55, 8]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
      <mesh position={[0.7, 0.4, 0]} rotation={[0, 0, -0.3]}>
        <cylinderGeometry args={[0.18, 0.22, 0.55, 8]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.15, 0]} rotation={[0, 0.2, 0]}>
        <sphereGeometry args={[0.25, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
    </group>
  ),
);
HoodieModel.displayName = "HoodieModel";

export const CapModel = forwardRef<THREE.Group, ModelProps>(
  ({ texture, color, onClick }, ref) => (
    <group ref={ref} onClick={onClick}>
      <mesh position={[0, 0.1, 0]}>
        <sphereGeometry args={[0.35, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2.2]} />
        <meshStandardMaterial
          map={texture}
          color={color}
          roughness={0.85}
          side={2}
        />
      </mesh>
      <mesh position={[0, 0.02, 0.2]}>
        <boxGeometry args={[0.5, 0.03, 0.12]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      <mesh position={[0, -0.08, 0]}>
        <torusGeometry args={[0.3, 0.03, 8, 16]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
    </group>
  ),
);
CapModel.displayName = "CapModel";

export const PoloModel = forwardRef<THREE.Group, ModelProps>(
  ({ texture, color, onClick }, ref) => (
    <group ref={ref} onClick={onClick}>
      <mesh position={[0, 0.55, 0]}>
        <boxGeometry args={[1.15, 0.75, 0.45]} />
        <meshStandardMaterial map={texture} color={color} roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.95, 0]}>
        <boxGeometry args={[0.35, 0.05, 0.3]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
      <mesh position={[-0.65, 0.35, 0]} rotation={[0, 0, 0.25]}>
        <cylinderGeometry args={[0.12, 0.16, 0.5, 8]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
      <mesh position={[0.65, 0.35, 0]} rotation={[0, 0, -0.25]}>
        <cylinderGeometry args={[0.12, 0.16, 0.5, 8]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
    </group>
  ),
);
PoloModel.displayName = "PoloModel";

export const MugModel = forwardRef<THREE.Group, ModelProps>(
  ({ texture, color, onClick }, ref) => (
    <group ref={ref} onClick={onClick}>
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.25, 0.22, 0.5, 24]} />
        <meshStandardMaterial map={texture} color={color} roughness={0.6} />
      </mesh>
      <mesh position={[0.3, 0.3, 0]} rotation={[0, 0, Math.PI / 4]}>
        <torusGeometry args={[0.08, 0.025, 8, 12, Math.PI / 2]} />
        <meshStandardMaterial color="#ddd" metalness={0.3} roughness={0.4} />
      </mesh>
    </group>
  ),
);
MugModel.displayName = "MugModel";

export const BottleModel = forwardRef<THREE.Group, ModelProps>(
  ({ texture, color, onClick }, ref) => (
    <group ref={ref} onClick={onClick}>
      <mesh position={[0, 0.35, 0]}>
        <cylinderGeometry args={[0.15, 0.2, 0.6, 16]} />
        <meshStandardMaterial map={texture} color={color} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.7, 0]}>
        <cylinderGeometry args={[0.07, 0.08, 0.18, 12]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.82, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.04, 12]} />
        <meshStandardMaterial color="#888" metalness={0.5} roughness={0.3} />
      </mesh>
    </group>
  ),
);
BottleModel.displayName = "BottleModel";

export const ToteBagModel = forwardRef<THREE.Group, ModelProps>(
  ({ texture, color, onClick }, ref) => (
    <group ref={ref} onClick={onClick}>
      <mesh position={[0, 0.3, 0]}>
        <boxGeometry args={[0.7, 0.5, 0.15]} />
        <meshStandardMaterial map={texture} color={color} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.6, 0]} rotation={[0.1, 0, 0]}>
        <boxGeometry args={[0.05, 0.4, 0.05]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.6, 0]} rotation={[-0.1, 0, 0]}>
        <boxGeometry args={[0.05, 0.4, 0.05]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
    </group>
  ),
);
ToteBagModel.displayName = "ToteBagModel";

export const CardModel = forwardRef<THREE.Group, ModelProps>(
  ({ texture, color, onClick }, ref) => (
    <group ref={ref} onClick={onClick}>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.8, 0.5, 0.02]} />
        <meshStandardMaterial map={texture} color={color} roughness={0.4} />
      </mesh>
    </group>
  ),
);
CardModel.displayName = "CardModel";

export const StickerModel = forwardRef<THREE.Group, ModelProps>(
  ({ texture, color, onClick }, ref) => (
    <group ref={ref} onClick={onClick}>
      <mesh position={[0, 0, 0]}>
        <planeGeometry args={[0.6, 0.6]} />
        <meshStandardMaterial map={texture} color={color} roughness={0.5} side={2} />
      </mesh>
    </group>
  ),
);
StickerModel.displayName = "StickerModel";

export const SweatshirtModel = forwardRef<THREE.Group, ModelProps>(
  ({ texture, color, onClick }, ref) => (
    <group ref={ref} onClick={onClick}>
      <mesh position={[0, 0.55, 0]}>
        <boxGeometry args={[1.2, 0.85, 0.5]} />
        <meshStandardMaterial map={texture} color={color} roughness={0.9} />
      </mesh>
      <mesh position={[-0.7, 0.35, 0]} rotation={[0, 0, 0.3]}>
        <cylinderGeometry args={[0.17, 0.21, 0.55, 8]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
      <mesh position={[0.7, 0.35, 0]} rotation={[0, 0, -0.3]}>
        <cylinderGeometry args={[0.17, 0.21, 0.55, 8]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
      <mesh position={[0, -0.02, 0]}>
        <boxGeometry args={[0.6, 0.03, 0.25]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
    </group>
  ),
);
SweatshirtModel.displayName = "SweatshirtModel";

export const BlouseModel = forwardRef<THREE.Group, ModelProps>(
  ({ texture, color, onClick }, ref) => (
    <group ref={ref} onClick={onClick}>
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[1.1, 0.9, 0.45]} />
        <meshStandardMaterial map={texture} color={color} roughness={0.9} />
      </mesh>
      <mesh position={[-0.65, 0.3, 0]} rotation={[0, 0, 0.25]}>
        <cylinderGeometry args={[0.14, 0.18, 0.55, 8]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
      <mesh position={[0.65, 0.3, 0]} rotation={[0, 0, -0.25]}>
        <cylinderGeometry args={[0.14, 0.18, 0.55, 8]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
      <mesh position={[0, -0.08, 0]}>
        <boxGeometry args={[0.45, 0.02, 0.2]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
    </group>
  ),
);
BlouseModel.displayName = "BlouseModel";

export function getThreeModel(productType: ProductType) {
  const models: Record<ProductType, React.ForwardRefExoticComponent<ModelProps & React.RefAttributes<THREE.Group>>> = {
    "t-shirt": TShirtModel,
    hoodie: HoodieModel,
    polo: PoloModel,
    sweatshirt: SweatshirtModel,
    cap: CapModel,
    jacket: JacketModel,
    "tote-bag": ToteBagModel,
    mug: MugModel,
    bottle: BottleModel,
    "business-card": CardModel,
    sticker: StickerModel,
    blouse: BlouseModel,
  };
  return models[productType];
}
