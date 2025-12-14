
import React, { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Icosahedron, MeshDistortMaterial, Float, Html, MeshTransmissionMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '../../store/useStore';

interface NeuralOrbProps {
    isProcessing?: boolean;
    onInteract?: () => void;
}

const Core = ({ isProcessing, theme }: { isProcessing: boolean, theme: 'onyx' | 'light' }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const [hovered, setHover] = useState(false);

    useFrame((state, delta) => {
        if (meshRef.current) {
            // Spin logic
            const baseSpeed = isProcessing ? 2 : 0.2;
            meshRef.current.rotation.x += delta * baseSpeed;
            meshRef.current.rotation.y += delta * baseSpeed * 0.5;

            // Scale pulsing
            const t = state.clock.getElapsedTime();
            const scale = 1 + Math.sin(t * 2) * (isProcessing ? 0.2 : 0.05);
            meshRef.current.scale.set(scale, scale, scale);
        }
    });

    const isOnyx = theme === 'onyx';

    return (
        <group>
            <Float speed={isProcessing ? 5 : 2} rotationIntensity={isProcessing ? 2 : 0.5} floatIntensity={1}>
                {/* Inner Core */}
                <Icosahedron
                    args={[1, 0]}
                    ref={meshRef}
                    onPointerOver={() => setHover(true)}
                    onPointerOut={() => setHover(false)}
                    scale={1.2}
                >
                    {isOnyx ? (
                        <MeshDistortMaterial
                            color="#D4AF37"
                            emissive="#D4AF37"
                            emissiveIntensity={isProcessing ? 0.8 : 0.2}
                            roughness={0.1}
                            metalness={0.8}
                            distort={isProcessing ? 0.6 : 0.3}
                            speed={isProcessing ? 5 : 2}
                            wireframe={true}
                            transparent
                            opacity={0.8}
                        />
                    ) : (
                        // LIGHT: Solid Royale Gold (Not chrome, not glass)
                        <MeshDistortMaterial
                            color="#eab308" // Yellow 500 (Gold)
                            emissive="#a16207" // Yellow 700 (Deep Gold)
                            emissiveIntensity={0.2}
                            roughness={0.15} // Polished but solid
                            metalness={1.0} // Full metal
                            distort={isProcessing ? 0.5 : 0.2}
                            speed={2}
                            wireframe={false} // Solid
                        />
                    )}
                </Icosahedron>

                {/* Outer Shell - Only for Onyx */}
                {isOnyx && (
                    <Icosahedron args={[1.5, 0]}>
                        <meshStandardMaterial
                            color="#046345"
                            wireframe
                            transparent
                            opacity={0.1}
                        />
                    </Icosahedron>
                )}
            </Float>
        </group>
    );
};

export const NeuralOrb: React.FC<NeuralOrbProps> = ({ isProcessing = false }) => {
    const { theme } = useStore();

    return (
        <div className="w-24 h-24 relative">
            <Canvas camera={{ position: [0, 0, 4], fov: 45 }}>
                <ambientLight intensity={theme === 'onyx' ? 0.5 : 1} />
                <pointLight position={[10, 10, 10]} intensity={2} />
                {/* Rim lights to make the gold pop in light mode */}
                {theme !== 'onyx' && (
                    <>
                        <spotLight position={[-10, 10, 5]} intensity={5} color="#ffffff" />
                        <spotLight position={[10, -10, 5]} intensity={5} color="#fbbf24" />
                    </>
                )}
                <Core isProcessing={isProcessing} theme={theme} />
            </Canvas>
        </div>
    );
};
