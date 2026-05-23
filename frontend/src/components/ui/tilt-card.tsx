"use client";

import React, { useRef } from "react";
import { motion, useMotionTemplate, useMotionValue, useSpring } from "framer-motion";
import { cn } from "@/lib/utils";

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
}

const ROTATION_RANGE = 15; // Max degrees of rotation
const HALF_ROTATION_RANGE = ROTATION_RANGE / 2;

export const TiltCard: React.FC<TiltCardProps> = ({ 
  children, 
  className,
  glowColor = "rgba(59, 130, 246, 0.4)" // Default primary blue glow
}) => {
  const ref = useRef<HTMLDivElement>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const xSpring = useSpring(x, { stiffness: 300, damping: 30 });
  const ySpring = useSpring(y, { stiffness: 300, damping: 30 });

  const transform = useMotionTemplate`rotateX(${xSpring}deg) rotateY(${ySpring}deg)`;

  // Spotlight effect
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const background = useMotionTemplate`radial-gradient(400px circle at ${mouseX}px ${mouseY}px, ${glowColor}, transparent 80%)`;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (!ref.current) return;
    
    const rect = ref.current.getBoundingClientRect();
    
    // Spotlight position
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);

    // 3D Tilt calculation
    const width = rect.width;
    const height = rect.height;

    const mouseXPos = (e.clientX - rect.left) * ROTATION_RANGE;
    const mouseYPos = (e.clientY - rect.top) * ROTATION_RANGE;

    const rX = (mouseYPos / height - HALF_ROTATION_RANGE) * -1;
    const rY = mouseXPos / width - HALF_ROTATION_RANGE;

    x.set(rX);
    y.set(rY);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
    mouseX.set(-1000); // Move spotlight off-screen smoothly
    mouseY.set(-1000);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transformStyle: "preserve-3d",
        transform,
      }}
      className={cn(
        "relative flex flex-col rounded-2xl border border-white/10 bg-white/5 p-8 transition-colors hover:border-white/20 glass-panel",
        className
      )}
    >
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background,
        }}
      />
      <div
        style={{ transform: "translateZ(50px)" }} // Pop-out effect for content
        className="relative z-10 w-full h-full"
      >
        {children}
      </div>
    </motion.div>
  );
};
