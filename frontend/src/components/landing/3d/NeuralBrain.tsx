import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export function NeuralBrain(props: any) {
  const pointsRef = useRef<THREE.Points>(null!)
  const linesRef = useRef<THREE.Mesh>(null!)

  // Generate random points on a sphere
  const particleCount = 1500
  const positions = useMemo(() => {
    const positions = new Float32Array(particleCount * 3)
    for (let i = 0; i < particleCount; i++) {
      const r = 2.2 + Math.random() * 0.3
      const theta = 2 * Math.PI * Math.random()
      const phi = Math.acos(2 * Math.random() - 1)
      const x = r * Math.sin(phi) * Math.cos(theta)
      const y = r * Math.sin(phi) * Math.sin(theta)
      const z = r * Math.cos(phi)
      
      positions[i * 3] = x
      positions[i * 3 + 1] = y
      positions[i * 3 + 2] = z
    }
    return positions
  }, [])

  useFrame((state) => {
    const time = state.clock.getElapsedTime()
    if (pointsRef.current) {
      pointsRef.current.rotation.y = time * 0.05
      pointsRef.current.rotation.x = Math.sin(time * 0.15) * 0.1
    }
    if (linesRef.current) {
      linesRef.current.rotation.y = time * 0.05
      linesRef.current.rotation.x = Math.sin(time * 0.15) * 0.1
    }
  })

  return (
    <group {...props}>
      {/* Particle Cloud */}
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={positions.length / 3}
            array={positions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.04}
          color="#00F0FF"
          transparent
          opacity={0.8}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

      {/* Geometric Structure */}
      <mesh ref={linesRef}>
        <icosahedronGeometry args={[2.2, 2]} />
        <meshBasicMaterial 
          color="#00F0FF" 
          wireframe 
          transparent 
          opacity={0.08} 
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Inner Core Glow */}
      <mesh>
        <sphereGeometry args={[1.8, 32, 32]} />
        <meshBasicMaterial 
          color="#006066" 
          transparent 
          opacity={0.15} 
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
}




