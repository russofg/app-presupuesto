"use client";

import React, { useEffect, useState, useRef } from "react";
import { motion, useMotionValue, useSpring } from "motion/react";

export function CustomCursor() {
  const [isVisible, setIsVisible] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const cursorRef = useRef<HTMLDivElement>(null);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 25, stiffness: 300, mass: 0.5 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Only show custom cursor on devices that support hover (desktops)
    const mediaQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
    
    if (!mediaQuery.matches) {
      return;
    }

    const mouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX - 16);
      mouseY.set(e.clientY - 16);
      if (!isVisible) setIsVisible(true);
    };

    const mouseEnter = () => setIsVisible(true);
    const mouseLeave = () => setIsVisible(false);

    // Detect hover on interactive elements
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName.toLowerCase() === "button" ||
        target.tagName.toLowerCase() === "a" ||
        target.closest("button") ||
        target.closest("a") ||
        target.closest("[role='button']")
      ) {
        setIsHovering(true);
      } else {
        setIsHovering(false);
      }
    };

    window.addEventListener("mousemove", mouseMove);
    window.addEventListener("mouseenter", mouseEnter);
    window.addEventListener("mouseleave", mouseLeave);
    window.addEventListener("mouseover", handleMouseOver);

    return () => {
      window.removeEventListener("mousemove", mouseMove);
      window.removeEventListener("mouseenter", mouseEnter);
      window.removeEventListener("mouseleave", mouseLeave);
      window.removeEventListener("mouseover", handleMouseOver);
    };
  }, [mouseX, mouseY, isVisible]);

  if (!mounted || !isVisible) return null;

  return (
    <motion.div
      ref={cursorRef}
      className={`fixed top-0 left-0 w-8 h-8 rounded-full pointer-events-none z-[9999] mix-blend-difference hidden md:flex items-center justify-center`}
      style={{
        x: smoothX,
        y: smoothY,
      }}
    >
      <motion.div 
        animate={{
          scale: isHovering ? 1.5 : 1,
          opacity: isHovering ? 0.5 : 1,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="w-full h-full bg-white rounded-full"
      />
    </motion.div>
  );
}
