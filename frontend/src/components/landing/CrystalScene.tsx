"use client";

import { useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";

const DEFAULT_COLOR = "#ff5a36";
const CRYSTAL_LIGHT = new THREE.Color("#ffcdb8");

/** The faceted glass gem — low-poly icosahedron so it reads as cut crystal, not a smooth sphere. */
function GemMesh({
  color,
  shakeRef,
  opacityRef,
  explodedRef,
}: {
  color: THREE.Color;
  shakeRef: React.RefObject<number>;
  opacityRef: React.RefObject<number>;
  explodedRef: React.RefObject<boolean>;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshPhysicalMaterial>(null);

  useFrame((state) => {
    const mesh = meshRef.current;
    const material = materialRef.current;
    if (!mesh || !material) return;

    if (explodedRef.current) {
      mesh.visible = false;
      return;
    }

    const t = state.clock.elapsedTime;
    // Slow ambient tumble.
    mesh.rotation.y = t * 0.25;
    mesh.rotation.x = Math.sin(t * 0.3) * 0.15;

    // Shake amplitude driven externally (scroll charge intensity).
    const amp = shakeRef.current;
    if (amp > 0.001) {
      mesh.position.x = (Math.random() - 0.5) * amp * 0.35;
      mesh.position.y = (Math.random() - 0.5) * amp * 0.35;
    } else {
      mesh.position.x = 0;
      mesh.position.y = 0;
    }

    material.opacity = opacityRef.current;
  });

  return (
    <mesh ref={meshRef} scale={[0.95, 1.35, 0.95]}>
      {/* detail 0 keeps raw flat icosahedron faces — with detail>0 the vertex
          normals get smoothed and it reads as a round ball instead of a gem. */}
      <icosahedronGeometry args={[1.35, 0]} />
      <meshPhysicalMaterial
        ref={materialRef}
        flatShading
        color={color}
        transmission={0.92}
        thickness={1.4}
        roughness={0.06}
        ior={1.9}
        clearcoat={1}
        clearcoatRoughness={0.05}
        emissive={color}
        emissiveIntensity={0.25}
        transparent
        opacity={1}
      />
    </mesh>
  );
}

interface ShardState {
  dir: THREE.Vector3;
  spin: THREE.Vector3;
  delay: number;
  speed: number;
  scale: number;
}

/**
 * Real 3D fragments of the gem, hidden at the core until `explodedRef` flips —
 * then each shard flies outward along its own vector, tumbling and fading,
 * so the crystal breaks apart as actual geometry instead of flat 2D shards.
 */
function Shards({
  color,
  explodedRef,
  count = 22,
}: {
  color: THREE.Color;
  explodedRef: React.RefObject<boolean>;
  count?: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const startRef = useRef<number | null>(null);

  const [shardStates] = useState<ShardState[]>(() =>
    Array.from({ length: count }, () => {
      const dir = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() - 0.5 + 0.3,
        Math.random() - 0.5
      ).normalize();
      return {
        dir,
        spin: new THREE.Vector3(
          (Math.random() - 0.5) * 6,
          (Math.random() - 0.5) * 6,
          (Math.random() - 0.5) * 6
        ),
        delay: Math.random() * 0.08,
        speed: 2.2 + Math.random() * 1.8,
        scale: 0.18 + Math.random() * 0.22,
      };
    })
  );

  useFrame((state) => {
    const group = groupRef.current;
    if (!group) return;

    if (!explodedRef.current) {
      group.visible = false;
      startRef.current = null;
      return;
    }

    if (startRef.current === null) startRef.current = state.clock.elapsedTime;
    group.visible = true;
    const t = state.clock.elapsedTime - startRef.current;

    group.children.forEach((child, i) => {
      const s = shardStates[i];
      const localT = Math.max(0, t - s.delay);
      // Outward burst that decelerates, plus gravity pulling it back down.
      const travel = 1 - Math.exp(-localT * 1.6);
      const dist = travel * s.speed;
      child.position.set(
        s.dir.x * dist,
        s.dir.y * dist - localT * localT * 1.1,
        s.dir.z * dist
      );
      child.rotation.x = s.spin.x * localT;
      child.rotation.y = s.spin.y * localT;
      child.rotation.z = s.spin.z * localT;

      const mat = (child as THREE.Mesh).material as THREE.MeshPhysicalMaterial;
      mat.opacity = Math.max(0, 1 - localT / 1.1);
    });
  });

  return (
    <group ref={groupRef} visible={false}>
      {shardStates.map((s, i) => (
        <mesh key={i} scale={s.scale}>
          <tetrahedronGeometry args={[1, 0]} />
          <meshPhysicalMaterial
            flatShading
            color={color}
            transmission={0.85}
            thickness={0.8}
            roughness={0.1}
            ior={1.8}
            clearcoat={1}
            emissive={color}
            emissiveIntensity={0.4}
            transparent
            opacity={1}
          />
        </mesh>
      ))}
    </group>
  );
}

/** A small bright core inside the gem, acting as its own light source — the "power source" glow. */
function CoreLight({
  intensityRef,
  explodedRef,
}: {
  intensityRef: React.RefObject<number>;
  explodedRef: React.RefObject<boolean>;
}) {
  const lightRef = useRef<THREE.PointLight>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const explodeStartRef = useRef<number | null>(null);

  useFrame((state) => {
    const light = lightRef.current;
    const core = coreRef.current;
    if (!light || !core) return;

    if (explodedRef.current) {
      if (explodeStartRef.current === null) explodeStartRef.current = state.clock.elapsedTime;
      const t = state.clock.elapsedTime - explodeStartRef.current;
      // A quick bright pulse as the core is released, then fade out.
      const flash = Math.max(0, 1 - t / 0.5);
      light.intensity = flash * 14;
      core.scale.setScalar(Math.max(0.001, 0.4 + t * 1.5) * flash);
      core.visible = flash > 0.01;
      return;
    }

    const pulse = 0.6 + Math.sin(state.clock.elapsedTime * 2.4) * 0.15 + intensityRef.current * 0.6;
    light.intensity = pulse * 6;
    core.scale.setScalar(0.28 + pulse * 0.12);
  });

  return (
    <>
      <pointLight ref={lightRef} color={CRYSTAL_LIGHT} distance={4} decay={2} />
      <mesh ref={coreRef}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshBasicMaterial color={CRYSTAL_LIGHT} toneMapped={false} />
      </mesh>
    </>
  );
}

/** Ambient glowing dust drifting around the gem — additive-blended points, brightening with charge intensity. */
function Particles({
  intensityRef,
  explodedRef,
}: {
  intensityRef: React.RefObject<number>;
  explodedRef: React.RefObject<boolean>;
}) {
  const pointsRef = useRef<THREE.Points>(null);
  const explodeStartRef = useRef<number | null>(null);
  const count = 90;

  // Lazy one-time random init (React's documented escape hatch) — never re-runs on render.
  const [[positions, baseY, speeds]] = useState<[Float32Array, Float32Array, Float32Array]>(() => {
    const pos = new Float32Array(count * 3);
    const spd = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const radius = 1.6 + Math.random() * 1.4;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = radius * Math.cos(phi);
      spd[i] = 0.2 + Math.random() * 0.5;
    }
    const baseY = pos.filter((_, i) => i % 3 === 1);
    return [pos, baseY, spd];
  });

  useFrame((state) => {
    const points = pointsRef.current;
    if (!points) return;
    const t = state.clock.elapsedTime;

    points.rotation.y = t * 0.05;
    const material = points.material as THREE.PointsMaterial;

    let fade = 1;
    if (explodedRef.current) {
      if (explodeStartRef.current === null) explodeStartRef.current = t;
      fade = Math.max(0, 1 - (t - explodeStartRef.current) / 0.8);
    }

    material.opacity = (0.35 + intensityRef.current * 0.5) * fade;
    material.size = 0.035 + intensityRef.current * 0.03;

    // Gentle per-particle bob, each at its own speed, drifting further with charge intensity.
    const posAttr = points.geometry.getAttribute("position") as THREE.BufferAttribute;
    const drift = 0.08 + intensityRef.current * 0.12;
    for (let i = 0; i < count; i++) {
      posAttr.array[i * 3 + 1] = baseY[i] + Math.sin(t * speeds[i] + i) * drift;
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color={CRYSTAL_LIGHT}
        size={0.035}
        transparent
        opacity={0.35}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}

export function CrystalScene({
  color = DEFAULT_COLOR,
  shakeRef,
  intensityRef,
  opacityRef,
  explodedRef,
  shardCount = 22,
  className = "",
}: {
  color?: string;
  shakeRef: React.RefObject<number>;
  intensityRef: React.RefObject<number>;
  opacityRef: React.RefObject<number>;
  explodedRef: React.RefObject<boolean>;
  shardCount?: number;
  className?: string;
}) {
  const crystalColor = useMemo(() => new THREE.Color(color), [color]);

  return (
    <div className={className}>
      <Canvas camera={{ position: [0, 0, 4.4], fov: 42 }} dpr={[1, 2]} gl={{ alpha: true }}>
        <ambientLight intensity={0.4} />
        <directionalLight position={[3, 4, 2]} intensity={0.8} color={CRYSTAL_LIGHT} />
        <GemMesh color={crystalColor} shakeRef={shakeRef} opacityRef={opacityRef} explodedRef={explodedRef} />
        <CoreLight intensityRef={intensityRef} explodedRef={explodedRef} />
        <Particles intensityRef={intensityRef} explodedRef={explodedRef} />
        <Shards color={crystalColor} explodedRef={explodedRef} count={shardCount} />
        <Environment preset="city" />
      </Canvas>
    </div>
  );
}
