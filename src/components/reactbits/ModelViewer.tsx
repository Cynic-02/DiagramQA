'use client'

import * as React from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, useGLTF, Stage, Center } from '@react-three/drei'
import { Loader2 } from 'lucide-react'
import * as THREE from 'three'

interface ModelProps {
  url: string
  autoRotate: boolean
  autoRotateSpeed: number
}

function Model({ url, autoRotate, autoRotateSpeed }: ModelProps) {
  const { scene } = useGLTF(url)
  const ref = React.useRef<THREE.Group>(null)

  useFrame((_, delta) => {
    if (autoRotate && ref.current) {
      ref.current.rotation.y += delta * autoRotateSpeed
    }
  })

  return <primitive ref={ref} object={scene} />
}

interface ModelViewerProps {
  url: string
  width?: number | string
  height?: number | string
  autoRotate?: boolean
  autoRotateSpeed?: number
  ambientIntensity?: number
}

export default function ModelViewer({
  url,
  width = '100%',
  height = '100%',
  autoRotate = true,
  autoRotateSpeed = 0.35,
  ambientIntensity = 0.5
}: ModelViewerProps) {
  return (
    <div
      style={{ width, height, position: 'relative' }}
      className="relative flex items-center justify-center overflow-hidden"
    >
      <React.Suspense
        fallback={
          <div className="absolute inset-0 flex items-center justify-center bg-card/10 backdrop-blur-sm z-10">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <Canvas camera={{ position: [0, 0, 3.5], fov: 45 }}>
          <ambientLight intensity={ambientIntensity} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <Stage environment="city" intensity={0.5} adjustCamera={true}>
            <Center>
              <Model url={url} autoRotate={autoRotate} autoRotateSpeed={autoRotateSpeed} />
            </Center>
          </Stage>
          <OrbitControls enableZoom={true} enablePan={false} minDistance={1.5} maxDistance={8} />
        </Canvas>
      </React.Suspense>
    </div>
  )
}
