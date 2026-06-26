"use client";

/**
 * 3D hero scene - floating geometric shapes rendered with three.js via
 * @react-three/fiber + @react-three/drei. Sits behind the hero text as a
 * ambient, performance-aware animated background.
 *
 * Design:
 *   - Deep gradient sky (violet → cyan → dark)
 *   - 18 floating icosahedrons / octahedrons / torus knots
 *   - Each rotates slowly + drifts on Y axis (parallax)
 *   - Mouse parallax: the whole group tilts toward the cursor
 *   - dpr clamped to [1, 1.5] for performance on mobile
 */
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float, MeshDistortMaterial, Environment } from "@react-three/drei";
import { useMemo, useRef, Suspense } from "react";
import type { Group, Mesh } from "three";
import * as THREE from "three";

const SHAPE_COLORS = ["#8b5cf6", "#06b6d4", "#f59e0b", "#10b981", "#f43f5e", "#14b8a6"];

interface FloatingShapeProps {
  position: [number, number, number];
  geometry: "ico" | "octa" | "torus" | "box" | "dodeca";
  color: string;
  scale: number;
  speed?: number;
  distort?: boolean;
}

function FloatingShape({ position, geometry, color, scale, speed = 1, distort = false }: FloatingShapeProps) {
  const meshRef = useRef<Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.getElapsedTime();
    meshRef.current.rotation.x = t * 0.15 * speed;
    meshRef.current.rotation.y = t * 0.2 * speed;
  });

  const geom = useMemo(() => {
    switch (geometry) {
      case "ico":
        return <icosahedronGeometry args={[1, 0]} />;
      case "octa":
        return <octahedronGeometry args={[1, 0]} />;
      case "torus":
        return <torusGeometry args={[0.7, 0.25, 16, 48]} />;
      case "box":
        return <boxGeometry args={[1.2, 1.2, 1.2]} />;
      case "dodeca":
        return <dodecahedronGeometry args={[1, 0]} />;
    }
  }, [geometry]);

  return (
    <Float speed={1.4 * speed} rotationIntensity={0.6} floatIntensity={1.2}>
      <mesh ref={meshRef} position={position} scale={scale} castShadow>
        {geom}
        {distort ? (
          <MeshDistortMaterial
            color={color}
            distort={0.35}
            speed={1.5}
            roughness={0.15}
            metalness={0.85}
            emissive={color}
            emissiveIntensity={0.25}
          />
        ) : (
          <meshStandardMaterial
            color={color}
            roughness={0.2}
            metalness={0.7}
            emissive={color}
            emissiveIntensity={0.18}
          />
        )}
      </mesh>
    </Float>
  );
}

function ParallaxGroup() {
  const groupRef = useRef<Group>(null);
  const { pointer } = useThree();

  useFrame(() => {
    if (!groupRef.current) return;
    // Smooth lerp toward pointer
    groupRef.current.rotation.y += (pointer.x * 0.25 - groupRef.current.rotation.y) * 0.04;
    groupRef.current.rotation.x += (-pointer.y * 0.18 - groupRef.current.rotation.x) * 0.04;
  });

  // Generate a stable set of shapes (memoized so it doesn't reshuffle on re-render)
  const shapes = useMemo<FloatingShapeProps[]>(() => {
    const types: FloatingShapeProps["geometry"][] = ["ico", "octa", "torus", "box", "dodeca"];
    const out: FloatingShapeProps[] = [];
    // Use a deterministic-ish pseudo-random spread so SSR and client match.
    let seed = 1337;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    for (let i = 0; i < 18; i++) {
      const x = (rand() - 0.5) * 14;
      const y = (rand() - 0.5) * 8;
      const z = (rand() - 0.5) * 6 - 2;
      out.push({
        position: [x, y, z],
        geometry: types[Math.floor(rand() * types.length)],
        color: SHAPE_COLORS[i % SHAPE_COLORS.length],
        scale: 0.4 + rand() * 0.9,
        speed: 0.5 + rand() * 1.2,
        distort: rand() > 0.55,
      });
    }
    return out;
  }, []);

  return (
    <group ref={groupRef}>
      {shapes.map((s, i) => (
        <FloatingShape key={i} {...s} />
      ))}
    </group>
  );
}

function CentralOrb() {
  const meshRef = useRef<Mesh>(null);
  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.getElapsedTime();
    meshRef.current.rotation.y = t * 0.3;
    meshRef.current.rotation.z = t * 0.15;
  });
  return (
    <Float speed={1} rotationIntensity={0.4} floatIntensity={0.8}>
      <mesh ref={meshRef} position={[0, 0, -1]} scale={2.2}>
        <icosahedronGeometry args={[1, 4]} />
        <MeshDistortMaterial
          color="#8b5cf6"
          emissive="#06b6d4"
          emissiveIntensity={0.4}
          distort={0.45}
          speed={2.2}
          roughness={0.05}
          metalness={0.95}
        />
      </mesh>
    </Float>
  );
}

export default function HeroScene3D() {
  return (
    <div className="absolute inset-0 -z-10" aria-hidden="true">
      <Canvas
        shadows
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 8], fov: 50 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      >
        <color attach="background" args={["#0a0a14"]} />
        <fog attach="fog" args={["#0a0a14", 8, 22]} />
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 6, 5]} intensity={1.1} castShadow />
        <pointLight position={[-6, -3, -4]} intensity={1.5} color="#06b6d4" />
        <pointLight position={[6, 4, 2]} intensity={1.2} color="#f59e0b" />
        <Suspense fallback={null}>
          <ParallaxGroup />
          <CentralOrb />
          <Environment preset="night" />
        </Suspense>
      </Canvas>
    </div>
  );
}
