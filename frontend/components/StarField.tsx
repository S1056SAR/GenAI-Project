"use client"

import { useRef } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { Stars, Sparkles, Float } from "@react-three/drei"
import type * as THREE from "three"

function AnimatedStars() {
  const starsRef = useRef<THREE.Group>(null)

  useFrame((state, delta) => {
    if (starsRef.current) {
      starsRef.current.rotation.x -= delta / 10
      starsRef.current.rotation.y -= delta / 15
    }
  })

  return (
    <group ref={starsRef}>
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      <Sparkles count={200} scale={12} size={4} speed={0.4} opacity={0.5} color="#06b6d4" />
      <Sparkles count={200} scale={12} size={4} speed={0.4} opacity={0.5} color="#a855f7" />
    </group>
  )
}

export default function StarField() {
  return (
    <div className="absolute inset-0 z-0 bg-gradient-to-b from-[#0f0c29] via-[#302b63] to-[#24243e]">
      <Canvas camera={{ position: [0, 0, 1] }}>
        <AnimatedStars />
      </Canvas>
    </div>
  )
}
