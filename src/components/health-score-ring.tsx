"use client";

import { useEffect, useState } from "react";
import { motion, useSpring, useTransform } from "motion/react";
import { getScoreLabel, getScoreColor, type HealthBreakdown } from "@/lib/gamification";
import { cn } from "@/lib/utils";

interface HealthScoreRingProps {
  score: number;
  breakdown: HealthBreakdown;
  className?: string;
}

export function HealthScoreRing({ score, breakdown, className }: HealthScoreRingProps) {
  const radius = 58;
  const stroke = 8;
  const circumference = 2 * Math.PI * radius;

  const spring = useSpring(0, { stiffness: 40, damping: 20 });
  const dashOffset = useTransform(spring, (v) => circumference - (v / 100) * circumference);
  const displayTransform = useTransform(spring, (v) => Math.round(v));
  const [displayScore, setDisplayScore] = useState(0);
  const scoreColor = getScoreColor(score);

  useEffect(() => {
    spring.set(score);
  }, [spring, score]);

  useEffect(() => {
    const unsub = displayTransform.on("change", (v) => setDisplayScore(v));
    return unsub;
  }, [displayTransform]);

  const breakdownItems = Object.values(breakdown);

  return (
    <div className={cn("rounded-2xl border border-border/50 bg-card p-5", className)}>
      <h3 className="text-sm font-semibold mb-4">Salud financiera</h3>

      <div className="flex items-center gap-5">
        <div className="relative w-[140px] h-[140px] shrink-0">
          <svg width="140" height="140" viewBox="0 0 140 140" className="-rotate-90">
            <circle
              cx="70" cy="70" r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={stroke}
              className="text-muted/30"
            />
            <motion.circle
              cx="70" cy="70" r={radius}
              fill="none"
              stroke={scoreColor}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circumference}
              style={{ strokeDashoffset: dashOffset }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold tabular-nums" style={{ color: scoreColor }}>
              {displayScore}
            </span>
            <span className="text-[10px] font-medium text-muted-foreground mt-0.5">
              {getScoreLabel(score)}
            </span>
          </div>
        </div>

        <div className="flex-1 space-y-2.5">
          {breakdownItems.map((item) => (
            <div key={item.label} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">
                  {item.label}
                  {"detail" in item && item.detail && (
                    <span className="ml-1 font-normal text-muted-foreground/80">({item.detail})</span>
                  )}
                </span>
                <span className="text-[11px] font-semibold tabular-nums">
                  {item.score === 0 && "detail" in item && item.detail?.startsWith("Sin ") ? "—" : item.score}
                </span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${item.score}%` }}
                  transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.3 }}
                  style={{ backgroundColor: getScoreColor(item.score) }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
