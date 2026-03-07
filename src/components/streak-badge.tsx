"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface StreakBadgeProps {
  count: number;
  className?: string;
}

export function StreakBadge({ count, className }: StreakBadgeProps) {
  if (count <= 0) return null;

  const intensity = count >= 30 ? "hot" : count >= 7 ? "warm" : "mild";
  const colors = {
    mild: "from-orange-500/10 to-amber-500/10 border-orange-500/20 text-orange-600 dark:text-orange-400",
    warm: "from-orange-500/15 to-red-500/10 border-orange-500/30 text-orange-500",
    hot: "from-red-500/15 to-pink-500/10 border-red-500/30 text-red-500",
  };

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.5 }}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-gradient-to-r text-xs font-bold tabular-nums",
        colors[intensity],
        className
      )}
    >
      <motion.span
        animate={{ scale: [1, 1.3, 1] }}
        transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 2 }}
      >
        🔥
      </motion.span>
      {count} {count === 1 ? "día" : "días"}
    </motion.div>
  );
}
