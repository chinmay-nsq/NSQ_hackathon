"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, OrbitControls } from "@react-three/drei";
import { COMPANION_MODEL_PATH, COMPANION_FALLBACK_COLOR } from "./companionAssets";
import { PlaceholderCreature } from "./PlaceholderCreature";
import { GltfCreature } from "./GltfCreature";
import { ModelErrorBoundary } from "./ModelErrorBoundary";

export function CompanionViewer({
  species,
  className = "",
  interactive = true,
}: {
  species: string;
  className?: string;
  interactive?: boolean;
}) {
  const path = COMPANION_MODEL_PATH[species];
  const color = COMPANION_FALLBACK_COLOR[species] ?? "var(--primary)";

  return (
    <div className={className}>
      <Canvas camera={{ position: [0, 0.6, 3.2], fov: 40 }} dpr={[1, 2]}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[3, 4, 2]} intensity={1.2} />
        <Suspense fallback={<PlaceholderCreature color={color} />}>
          <ModelErrorBoundary fallback={<PlaceholderCreature color={color} />}>
            {path ? <GltfCreature path={path} /> : <PlaceholderCreature color={color} />}
          </ModelErrorBoundary>
          <Environment preset="city" />
        </Suspense>
        {interactive && (
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            autoRotate
            autoRotateSpeed={1.2}
            minPolarAngle={Math.PI / 2.6}
            maxPolarAngle={Math.PI / 1.8}
          />
        )}
      </Canvas>
    </div>
  );
}
