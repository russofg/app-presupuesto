"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Float, MeshTransmissionMaterial, Sparkles, Icosahedron, Octahedron, Sphere } from "@react-three/drei";
import * as THREE from "three";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { icons } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface LevelCard3DProps {
  name: string;
  icon: string | LucideIcon;
  progress: number;
  xpToNext: number;
  totalXP?: number;
  streakCount?: number;
  color: string;
  className?: string;
}

function SparklesScene({ color }: { color: string }) {
  const { viewport } = useThree();
  const isMobile = viewport.width < 5;
  return (
    <Sparkles 
      count={isMobile ? 40 : 150} 
      scale={[viewport.width, viewport.height, 4]} 
      size={isMobile ? 1.5 : 2.5} 
      speed={0.4} 
      opacity={0.4} 
      color={color} 
      position={[0, 0, -2]} 
    />
  );
}

function GemScene({ color }: { color: string }) {
  const mesh1 = useRef<THREE.Mesh>(null);
  const mesh2 = useRef<THREE.Mesh>(null);
  const mesh3 = useRef<THREE.Mesh>(null);
  
  useFrame((state: any) => {
    const t = state.clock.elapsedTime;
    if (mesh1.current) {
      mesh1.current.rotation.y = t * 0.2;
      mesh1.current.rotation.x = t * 0.1;
    }
    if (mesh2.current) {
      mesh2.current.rotation.y = t * 0.3;
      mesh2.current.rotation.x = t * 0.4;
    }
    if (mesh3.current) {
      mesh3.current.rotation.y = -t * 0.15;
      mesh3.current.rotation.x = -t * 0.25;
    }
  });

  return (
    <>
      <Float floatIntensity={2} rotationIntensity={1} speed={2}>
        <Icosahedron ref={mesh1} args={[1.4, 0]} position={[0, 0, -1]}>
          <MeshTransmissionMaterial 
            backside 
            samples={4} 
            thickness={1} 
            chromaticAberration={0.1} 
            anisotropy={0.2}
            distortion={0.5} 
            distortionScale={0.5} 
            temporalDistortion={0.2} 
            color={color}
            resolution={512}
          />
        </Icosahedron>
      </Float>

      <Float floatIntensity={1.5} rotationIntensity={2} speed={1.5}>
        <Octahedron ref={mesh2} args={[0.35, 0]} position={[-2.2, 0.8, -1.5]}>
          <MeshTransmissionMaterial backside samples={2} thickness={0.5} chromaticAberration={0.08} distortion={0.3} color={color} resolution={256} />
        </Octahedron>
      </Float>
      
      <Float floatIntensity={2} rotationIntensity={1.5} speed={1}>
        <Icosahedron ref={mesh3} args={[0.25, 0]} position={[1.5, -0.6, -1]}>
          <MeshTransmissionMaterial backside samples={2} thickness={0.5} chromaticAberration={0.05} distortion={0.2} color={color} resolution={256} />
        </Icosahedron>
      </Float>
      
      <Float floatIntensity={1} rotationIntensity={0.5} speed={2}>
         <Sphere args={[0.15, 16, 16]} position={[-0.5, -1.2, -0.5]}>
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} toneMapped={false} />
         </Sphere>
      </Float>
    </>
  );
}

export function LevelCard3D({ name, icon, progress, xpToNext, totalXP = 0, streakCount = 0, color, className }: LevelCard3DProps) {
  const IconComponent = typeof icon === "string" ? (icons as any)[icon as keyof typeof icons] || icons.Circle : icon;

  const hexColor = useMemo(() => {
    if (color.includes("emerald") || color.includes("green")) return "#10b981";
    if (color.includes("blue")) return "#3b82f6";
    if (color.includes("purple") || color.includes("violet") || color.includes("fuchsia")) return "#a855f7";
    if (color.includes("amber") || color.includes("orange") || color.includes("yellow")) return "#f59e0b";
    if (color.includes("rose") || color.includes("red")) return "#f43f5e";
    if (color.includes("zinc") || color.includes("slate") || color.includes("gray")) return "#94a3b8";
    if (color.includes("indigo")) return "#6366f1";
    return "#3b82f6";
  }, [color]);

  const colorName = color.replace("text-", "").split("-")[0];

  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-card/80 to-card/20 backdrop-blur-2xl p-5 sm:p-7 flex items-center group transition-all duration-500 cursor-default shadow-2xl", 
      className
    )}>
      {/* Glowing atmospheric layers */}
      <div 
        className={cn("absolute inset-0 opacity-20 transition-opacity duration-700 group-hover:opacity-40", `bg-${colorName}-500/20`)} 
        style={{ filter: "blur(60px)" }} 
      />
      <div 
        className={cn("absolute -left-20 -top-20 w-64 h-64 rounded-full mix-blend-screen opacity-20 transition-transform duration-1000 group-hover:scale-150", `bg-${colorName}-500`)} 
        style={{ filter: "blur(80px)" }} 
      />

      {/* Full-width Canvas for Sparkles */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-80">
        <Canvas camera={{ position: [0, 0, 5], fov: 40 }} dpr={[1, 2]}>
          <SparklesScene color={hexColor} />
        </Canvas>
      </div>

      {/* Square Canvas for Gems (Guarantees no stretching) */}
      <div className="absolute right-[-20px] sm:right-0 top-1/2 -translate-y-1/2 w-[220px] sm:w-[350px] h-[220px] sm:h-[350px] z-0 opacity-90 pointer-events-none transition-transform duration-1000 group-hover:scale-105">
        <Canvas camera={{ position: [0, 0, 5], fov: 40 }} dpr={[1, 2]}>
          <ambientLight intensity={0.5} />
          <Environment preset="city" />
          <GemScene color={hexColor} />
        </Canvas>
      </div>

      {/* 2D Gamification Info - Elevated Z-Index */}
      <div className="relative z-10 flex w-full flex-col sm:flex-row sm:items-center justify-between gap-6 pointer-events-none">
        
        {/* Left: Level & Progress */}
        <div className="flex-1 min-w-0 max-w-[280px]">
          <div className="flex items-center gap-3 mb-3">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shadow-inner border border-white/20", `bg-${colorName}-500/30`)}>
              <IconComponent className={cn("w-5 h-5 drop-shadow-md", color)} />
            </div>
            <div>
              <p className="text-xs font-medium text-white/60 tracking-wider uppercase mb-0.5">Nivel Actual</p>
              <span className="text-xl font-bold tracking-tight text-white drop-shadow-sm leading-none">{name}</span>
            </div>
          </div>

          <div className="relative h-2.5 w-full bg-black/50 overflow-hidden rounded-full mb-2.5 border border-white/10 shadow-inner">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ type: "spring", damping: 20, stiffness: 100, delay: 0.1 }}
              className={cn("absolute inset-y-0 left-0 rounded-full", `bg-${colorName}-500`)}
              style={{ boxShadow: `0 0 15px ${hexColor}80, inset 0 0 5px white` }}
            />
          </div>

          <p className="text-[13px] text-white/70 font-medium tracking-wide">
            <span className={cn("font-bold text-white drop-shadow-md", color)}>{Math.round(xpToNext)} XP</span> para el próximo nivel
          </p>
        </div>

        {/* Center: Extra Gamification Stats */}
        <div className="hidden md:flex flex-row items-center gap-10 mr-auto ml-10">
          <div className="flex flex-col">
            <span className="text-xs font-medium text-white/50 uppercase tracking-widest mb-1">XP Total</span>
            <span className={cn("text-2xl font-black tracking-tighter drop-shadow-md", color)}>
              {totalXP.toLocaleString()}
            </span>
          </div>
          <div className="w-px h-10 bg-white/10" />
          <div className="flex flex-col">
            <span className="text-xs font-medium text-white/50 uppercase tracking-widest mb-1">Racha Activa</span>
            <span className="text-2xl font-black tracking-tighter text-white drop-shadow-md flex items-center gap-1.5">
              {streakCount} <span className="text-orange-500 text-lg">🔥</span>
            </span>
          </div>
        </div>

        {/* Right spacing to prevent text from overlapping the 3D Gem */}
        <div className="w-[120px] sm:w-[260px] shrink-0" />
      </div>
    </div>
  );
}
