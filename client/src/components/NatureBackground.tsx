
import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../store/useStore';

const vertexShader = `
varying vec2 vUv;
varying vec3 vPosition;

void main() {
    vUv = uv;
    vPosition = position;
    gl_Position = vec4(position, 1.0);
}
`;

const fragmentShader = `
uniform float uTime;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uColorC;
uniform int uIsLight; // 0 for Onyx, 1 for Light

varying vec2 vUv;
varying vec3 vPosition;

float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm(vec2 st) {
    float v = 0.0;
    float a = 0.5;
    vec2 shift = vec2(100.0);
    mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.50));
    for (int i = 0; i < 5; ++i) {
        v += a * noise(st);
        st = rot * st * 2.0 + shift;
        a *= 0.5;
    }
    return v;
}

void main() {
    vec2 st = vUv;
    float t = uTime * 0.05;

    // Onyx: Forest Mist (Deep & Dark)
    if (uIsLight == 0) {
        float n1 = noise(st * 3.0 + t);
        float n2 = noise(st * 6.0 - t * 0.5);
        vec3 color = mix(uColorA, uColorB, n1 + n2 * 0.5);
        float glow = smoothstep(0.4, 0.6, n1 * n2);
        color = mix(color, uColorC, glow * 0.3);
        gl_FragColor = vec4(color, 1.0);
    } 
    
    // Light: Liquid Gold (Royal White)
    else {
        // Gold Flow Logic - Swirly and luxurious
        vec2 q = vec2(0.);
        q.x = fbm( st + 0.00*t);
        q.y = fbm( st + vec2(1.0));

        vec2 r = vec2(0.);
        r.x = fbm( st + 1.0*q + vec2(1.7,9.2)+ 0.15*t );
        r.y = fbm( st + 1.0*q + vec2(8.3,2.8)+ 0.126*t);

        float f = fbm(st+r);

        // Mix White (A) -> Champagne (B)
        vec3 color = mix(uColorA, uColorB, clamp((f*f)*4.0, 0.0, 1.0) );
        
        // Add deep Gold/Amber (C) veins
        float veins = clamp(length(q),0.0,1.0);
        color = mix(color, uColorC, veins * 0.6); // 0.6 intensity
        
        // Add high-specular shine (White)
        float shine = clamp(length(r.x),0.0,1.0);
        color += vec3(0.1) * shine; // Subtle gloss

        gl_FragColor = vec4(color, 1.0);
    }
}
`;

const MistPlane = ({ theme }: { theme: 'onyx' | 'light' }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const uniforms = useMemo(
        () => ({
            uTime: { value: 0 },
            uColorA: { value: new THREE.Color() },
            uColorB: { value: new THREE.Color() },
            uColorC: { value: new THREE.Color() },
            uIsLight: { value: 0 }
        }),
        []
    );

    useFrame((state) => {
        if (meshRef.current) {
            const material = meshRef.current.material as THREE.ShaderMaterial;
            material.uniforms.uTime.value = state.clock.getElapsedTime();

            if (theme === 'onyx') {
                material.uniforms.uIsLight.value = 0;
                material.uniforms.uColorA.value.set('#022c22');
                material.uniforms.uColorB.value.set('#064e3b');
                material.uniforms.uColorC.value.set('#D4AF37');
            } else {
                material.uniforms.uIsLight.value = 1;
                // Liquid Gold Palette
                material.uniforms.uColorA.value.set('#FFFFFF'); // Pure White Base
                material.uniforms.uColorB.value.set('#FDE68A'); // Amber 200 (Champagne)
                material.uniforms.uColorC.value.set('#D97706'); // Amber 600 (Deep Gold)
            }
        }
    });

    return (
        <mesh ref={meshRef}>
            <planeGeometry args={[2, 2]} />
            <shaderMaterial
                vertexShader={vertexShader}
                fragmentShader={fragmentShader}
                uniforms={uniforms}
            />
        </mesh>
    );
};

const NatureBackground: React.FC = () => {
    const { theme } = useStore();

    return (
        <div className="fixed inset-0 w-full h-full pointer-events-none -z-10 transition-opacity duration-1000">
            <Canvas camera={{ position: [0, 0, 1] }}>
                <MistPlane theme={theme} />
            </Canvas>
        </div>
    );
};

export default NatureBackground;
