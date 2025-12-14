
import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, MeshDistortMaterial, Sparkles, Float, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

const OrganicShape = () => {
    const meshRef = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        if (meshRef.current) {
            // value is 0-1, we want subtle movement
            const t = state.clock.getElapsedTime();
            meshRef.current.rotation.x = t * 0.1;
            meshRef.current.rotation.y = t * 0.15;
            // Pulse scale slightly
            const scale = 1 + Math.sin(t * 0.5) * 0.05;
            meshRef.current.scale.set(scale, scale, scale);
        }
    });

    return (
        <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
            <Sphere args={[1, 100, 200]} scale={2.4} ref={meshRef}>
                <MeshDistortMaterial
                    color="#D4AF37" // Gold
                    attach="material"
                    distort={0.4} // Strength, 0 disables distort (default: 1)
                    speed={2} // Speed (default: 1)
                    roughness={0.2}
                    metalness={0.9}
                    emissive="#103c2e" // Slight Emerald glow from within
                    emissiveIntensity={0.1}
                />
            </Sphere>
        </Float>
    );
};

const ConnectedParticles = () => {
    return (
        <group>
            {/* Gold Sparkles */}
            <Sparkles
                count={150}
                scale={12}
                size={4}
                speed={0.4}
                opacity={0.7}
                color="#D4AF37"
            />
            {/* Emerald Sparkles */}
            <Sparkles
                count={100}
                scale={15}
                size={6}
                speed={0.3}
                opacity={0.5}
                color="#046345" // Emerald Green
            />
        </group>
    )
}

const LoginBackground: React.FC = () => {
    return (
        <div className="absolute inset-0 w-full h-full -z-0">
            <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
                <ambientLight intensity={0.5} />
                <directionalLight position={[10, 10, 5]} intensity={1.5} color="#ffffff" />
                <directionalLight position={[-10, -10, -5]} intensity={1} color="#046345" /> {/* Emerald backlight */}

                <OrganicShape />
                <ConnectedParticles />

                {/* Slight mouse interaction, but limited to prevent dizziness */}
                <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.5} maxPolarAngle={Math.PI / 1.5} minPolarAngle={Math.PI / 3} />
            </Canvas>
            {/* Overlay gradient to ensure text readability if mesh gets too bright */}
            <div className="absolute inset-0 bg-gradient-to-t from-emerald-deep/80 via-transparent to-emerald-deep/30 pointer-events-none"></div>
        </div>
    );
};

export default LoginBackground;
