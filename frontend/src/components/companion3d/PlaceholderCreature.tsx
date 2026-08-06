"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Mesh } from "three";

/** A simple bobbing/rotating blob shown until a real .glb model is dropped in for this species. */
export function PlaceholderCreature({ color }: { color: string }) {
  const meshRef = useRef<Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.y = state.clock.elapsedTime * 0.6;
    meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 1.4) * 0.15;
  });

  return (
    <mesh ref={meshRef}>
      <icosahedronGeometry args={[1, 1]} />
      <meshStandardMaterial color={color} roughness={0.4} metalness={0.1} />
    </mesh>
  );
}
