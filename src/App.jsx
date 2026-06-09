import { useEffect, useMemo, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { Float, OrbitControls, Text, Environment } from '@react-three/drei';
import { create } from 'zustand';
import { Howl } from 'howler';
import gsap from 'gsap';
import { motion } from 'framer-motion';

const useMythosStore = create((set) => ({
  accent: '#f59e0b',
  pulseCount: 0,
  soundReady: false,
  incrementPulse: () => set((state) => ({ pulseCount: state.pulseCount + 1 })),
  setSoundReady: (soundReady) => set({ soundReady }),
}));

function MythosOrb() {
  const meshRef = useRef(null);
  const incrementPulse = useMythosStore((state) => state.incrementPulse);
  const accent = useMythosStore((state) => state.accent);

  useEffect(() => {
    if (!meshRef.current) {
      return undefined;
    }

    const tween = gsap.to(meshRef.current.rotation, {
      y: Math.PI * 2,
      duration: 8,
      repeat: -1,
      ease: 'none',
    });

    return () => {
      tween.kill();
    };
  }, []);

  return (
    <Float speed={2} rotationIntensity={1.2} floatIntensity={1.6}>
      <mesh ref={meshRef} onClick={incrementPulse}>
        <icosahedronGeometry args={[1.45, 1]} />
        <meshStandardMaterial color={accent} metalness={0.55} roughness={0.18} />
      </mesh>
      <Text
        position={[0, -2.2, 0]}
        fontSize={0.28}
        color="#fdf6e3"
        anchorX="center"
        anchorY="middle"
      >
        Click the orb
      </Text>
    </Float>
  );
}

export default function App() {
  const pulseCount = useMythosStore((state) => state.pulseCount);
  const soundReady = useMythosStore((state) => state.soundReady);
  const setSoundReady = useMythosStore((state) => state.setSoundReady);
  const heroRef = useRef(null);

  const chime = useMemo(
    () =>
      new Howl({
        src: [
          'data:audio/wav;base64,UklGRlQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YTAAAAAAAP//AAD//wAA//8AAP//AAD//wAA'
        ],
        volume: 0.25,
      }),
    [],
  );

  useEffect(() => {
    setSoundReady(true);

    if (heroRef.current) {
      gsap.fromTo(
        heroRef.current,
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out' },
      );
    }

    return () => {
      chime.unload();
      setSoundReady(false);
    };
  }, [chime, setSoundReady]);

  useEffect(() => {
    if (pulseCount > 0) {
      chime.play();
    }
  }, [chime, pulseCount]);

  return (
    <div className="app-shell">
      <motion.section
        className="hero"
        ref={heroRef}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        <div className="copy">
          <motion.p
            className="eyebrow"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
          >
            React + immersive tooling
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            Mythos is ready to build.
          </motion.h1>
          <motion.p
            className="lede"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            This starter app is wired up with Three.js, React Three Fiber, Drei,
            Zustand, Howler, GSAP, and Framer Motion.
          </motion.p>
          <div className="stats">
            <div>
              <span>Orb taps</span>
              <strong>{pulseCount}</strong>
            </div>
            <div>
              <span>Audio</span>
              <strong>{soundReady ? 'Ready' : 'Loading'}</strong>
            </div>
          </div>
        </div>

        <div className="scene">
          <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
            <color attach="background" args={['#120f0a']} />
            <ambientLight intensity={0.8} />
            <directionalLight position={[3, 4, 5]} intensity={2} />
            <MythosOrb />
            <Environment preset="sunset" />
            <OrbitControls enablePan={false} />
          </Canvas>
        </div>
      </motion.section>
    </div>
  );
}
