"use client";

import { useEffect, useRef } from "react";
import { ReactLenis } from "lenis/react";
import { usePathname } from "next/navigation";

export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const lenisRef = useRef<any>(null);
  const pathname = usePathname();

  // Reset scroll to top on path change
  useEffect(() => {
    if (lenisRef.current?.lenis) {
      lenisRef.current.lenis.scrollTo(0, { immediate: true });
    }
  }, [pathname]);

  return (
    <ReactLenis
      ref={lenisRef}
      root
      options={{
        lerp: 0.05, // Lower lerp means smoother and heavier (more "buttery")
        wheelMultiplier: 1.2,
        smoothWheel: true,
        touchMultiplier: 2,
        syncTouch: true, // Native-like smooth touch scrolling
      }}
    >
      {children}
    </ReactLenis>
  );
}
