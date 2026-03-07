"use client";

import { useEffect, useRef } from "react";
import { useInView, useMotionValue, useSpring } from "motion/react";
import { formatCurrency } from "@/lib/format";

interface NumberTickerProps {
  value: number;
  direction?: "up" | "down";
  className?: string;
  delay?: number; // in seconds
  currency?: string;
  decimalPlaces?: number;
}

export function NumberTicker({
  value,
  direction = "up",
  delay = 0,
  className,
  currency,
  decimalPlaces = 2,
}: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(direction === "down" ? value : 0);
  const springValue = useSpring(motionValue, {
    damping: 60,
    stiffness: 100,
  });
  const isInView = useInView(ref, { once: true, margin: "0px" });

  useEffect(() => {
    if (isInView) {
      setTimeout(() => {
        motionValue.set(value);
      }, delay * 1000);
    }
  }, [motionValue, isInView, delay, value]);

  useEffect(() => {
    return springValue.on("change", (latest) => {
      if (ref.current) {
        if (currency) {
          // Si es moneda, formatearla
          ref.current.textContent = formatCurrency(latest, currency as any);
        } else {
          // Si es un número normal (como XP)
          ref.current.textContent = Intl.NumberFormat("es-AR", {
            minimumFractionDigits: decimalPlaces,
            maximumFractionDigits: decimalPlaces,
          }).format(latest);
        }
      }
    });
  }, [springValue, currency, decimalPlaces]);

  return (
    <span
      className={className}
      ref={ref}
    />
  );
}
