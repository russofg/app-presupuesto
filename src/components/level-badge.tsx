"use client";

import { motion, AnimatePresence } from "motion/react";
import { NumberTicker } from "@/components/ui/number-ticker";
import { useUISounds } from "@/hooks/use-ui-sounds";
import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";

interface LevelBadgeProps {
  name: string;
  icon: string;
  progress: number;
  xpToNext: number;
  color: string;
  compact?: boolean;
  className?: string;
}

export function LevelBadge({
  name,
  icon,
  progress,
  xpToNext,
  color,
  compact = false,
  className,
}: LevelBadgeProps) {
  const { playLevelUp } = useUISounds();
  const prevNameRef = useRef(name);
  const prevXpRef = useRef(xpToNext);

  useEffect(() => {
    // Si el nombre de nivel cambia, o si llegamos a 0 XP (nivel máximo) por primera vez
    if (prevNameRef.current !== name || (prevXpRef.current > 0 && xpToNext === 0)) {
      playLevelUp();
    }
    prevNameRef.current = name;
    prevXpRef.current = xpToNext;
  }, [name, xpToNext, playLevelUp]);

  if (compact) {
    return (
      <motion.div
        key={name}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold cursor-default",
          className
        )}
        style={{ backgroundColor: `${color}15`, color }}
      >
        <span className="text-sm">{icon}</span>
        {name}
      </motion.div>
    );
  }

  return (
    <div className={cn("space-y-2 group cursor-default", className)}>
      <div className="flex items-center gap-3">
        <motion.div
           key={icon}
           initial={{ scale: 0, rotate: -45 }}
           animate={{ scale: 1, rotate: 0 }}
           whileHover={{ scale: 1.15, rotate: 5 }}
           transition={{ type: "spring", stiffness: 400, damping: 15 }}
           className="text-2xl drop-shadow-sm pointer-events-auto"
        >
          {icon}
        </motion.div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[13px] font-bold tracking-tight" style={{ color }}>
              {name}
            </span>
            <AnimatePresence mode="popLayout">
              {xpToNext > 0 ? (
                <motion.span
                  key="xp"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="text-[10px] text-muted-foreground/80 font-medium flex items-center gap-1"
                >
                  <NumberTicker value={xpToNext} decimalPlaces={0} /> XP más
                </motion.span>
              ) : (
                <motion.span
                  key="max"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-[10px] font-bold text-amber-500 flex items-center gap-1"
                >
                  Nivel Máximo
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          <div className="h-1.5 flex-1 w-full bg-muted/60 rounded-full overflow-hidden mt-1 relative">
            <motion.div
              className="absolute top-0 left-0 bottom-0 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ type: "spring", stiffness: 60, damping: 12, delay: 0.1 }}
              style={{ backgroundColor: color }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
