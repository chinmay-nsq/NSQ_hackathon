"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import type { Group } from "three";

/** Loads and gently bobs/rotates a companion's .glb model. Throws (via useGLTF) if the file is missing — caught by the parent ErrorBoundary. */
export function GltfCreature({ path }: { path: string }) {
  const { scene } = useGLTF(path);
  const groupRef = useRef<Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y = state.clock.elapsedTime * 0.4;
    groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 1.2) * 0.1;
  });

  return <primitive ref={groupRef} object={scene} scale={1} />;
}
