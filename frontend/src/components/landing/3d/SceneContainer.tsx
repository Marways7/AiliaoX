import { Canvas } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, Stars, Sparkles } from '@react-three/drei'
import { NeuralBrain } from './NeuralBrain'
import { Suspense } from 'react'

export default function SceneContainer() {
  return (
    <div className="absolute inset-0 z-0 w-full h-full pointer-events-none">
      <Canvas gl={{ antialias: true, alpha: true }} dpr={[1, 2]}>
        <PerspectiveCamera makeDefault position={[0, 0, 8]} fov={45} />
        
        <ambientLight intensity={0.2} />
        <pointLight position={[10, 10, 10]} intensity={1.5} color="#00F0FF" />
        <pointLight position={[-10, -10, -5]} intensity={1} color="#7000FF" />
        
        <Suspense fallback={null}>
            <group position={[3.5, 0, 0]} rotation={[0, -0.2, 0]}>
              <NeuralBrain />
            </group>
            
            <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={0.5} />
            <Sparkles count={200} scale={12} size={2} speed={0.4} opacity={0.5} color="#00F0FF" />
        </Suspense>
        
        <OrbitControls 
            enableZoom={false} 
            enablePan={false} 
            enableRotate={true}
            autoRotate 
            autoRotateSpeed={0.5}
            maxPolarAngle={Math.PI / 1.8}
            minPolarAngle={Math.PI / 2.2}
        />
      </Canvas>
    </div>
  )
}

