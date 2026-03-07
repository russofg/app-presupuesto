"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useSpring, useTransform } from "motion/react";

interface AnimatedNumberProps {
  value: number;
  className?: string;
  formatter?: (val: number) => string;
  duration?: number;
}

export function AnimatedNumber({
  value,
  className,
  formatter = (v) => v.toFixed(2),
  duration = 0.8,
}: AnimatedNumberProps) {
  const spring = useSpring(0, {
    stiffness: 100,
    damping: 30,
    duration,
  });

  const display = useTransform(spring, (current) => formatter(current));
  const [displayValue, setDisplayValue] = useState(formatter(0));

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  useEffect(() => {
    const unsubscribe = display.on("change", (v) => setDisplayValue(v));
    return unsubscribe;
  }, [display]);

  return (
    <motion.span className={className} aria-label={formatter(value)}>
      {displayValue}
    </motion.span>
  );
}
