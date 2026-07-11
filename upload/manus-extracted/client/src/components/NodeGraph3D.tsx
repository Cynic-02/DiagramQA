import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';

function AnimatedNodes() {
  const pointsRef = useRef<THREE.Points>(null);
  const linesRef = useRef<THREE.LineSegments>(null);

  // Generate node positions
  const nodes = useMemo(() => {
    const positions = new Float32Array(150); // 50 nodes * 3 coords
    for (let i = 0; i < 50; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    return positions;
  }, []);

  // Generate connecting lines
  const lines = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const positions: number[] = [];

    const nodeArray = [];
    for (let i = 0; i < 50; i++) {
      nodeArray.push({
        x: nodes[i * 3],
        y: nodes[i * 3 + 1],
        z: nodes[i * 3 + 2],
      });
    }

    // Connect nearby nodes
    for (let i = 0; i < nodeArray.length; i++) {
      for (let j = i + 1; j < nodeArray.length; j++) {
        const dx = nodeArray[i].x - nodeArray[j].x;
        const dy = nodeArray[i].y - nodeArray[j].y;
        const dz = nodeArray[i].z - nodeArray[j].z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (distance < 4) {
          positions.push(nodeArray[i].x, nodeArray[i].y, nodeArray[i].z);
          positions.push(nodeArray[j].x, nodeArray[j].y, nodeArray[j].z);
        }
      }
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
    return geometry;
  }, [nodes]);

  useFrame(() => {
    if (pointsRef.current) {
      pointsRef.current.rotation.x += 0.0003;
      pointsRef.current.rotation.y += 0.0005;
    }
    if (linesRef.current) {
      linesRef.current.rotation.x += 0.0003;
      linesRef.current.rotation.y += 0.0005;
    }
  });

  return (
    <>
      <Points ref={pointsRef} positions={nodes} stride={3} frustumCulled={false}>
        <PointMaterial
          transparent
          color="#06B6D4"
          size={0.15}
          sizeAttenuation={true}
          depthWrite={false}
        />
      </Points>

      <lineSegments ref={linesRef} geometry={lines}>
        <lineBasicMaterial color="#06B6D4" transparent opacity={0.3} />
      </lineSegments>
    </>
  );
}

export default function NodeGraph3D() {
  return (
    <Canvas
      camera={{ position: [0, 0, 15], fov: 75 }}
      style={{ width: '100%', height: '100%' }}
      dpr={[1, 2]}
    >
      <AnimatedNodes />
      <OrbitControls
        autoRotate
        autoRotateSpeed={2}
        enableZoom={false}
        enablePan={false}
        enableRotate={true}
      />
    </Canvas>
  );
}
