"use client";

import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { NumberTicker } from "@/components/ui/number-ticker";
import type { Currency } from "@/types";
import type { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: number;
  previousValue?: number;
  currency: Currency;
  icon: LucideIcon;
  trend: "positive" | "negative" | "neutral";
  color?: "success" | "destructive" | "primary" | "default";
  subtitle?: string;
}

const colorConfig = {
  success: {
    icon: "text-emerald-500 bg-emerald-500/10",
    gradient: "from-emerald-500/5 via-transparent to-transparent",
    border: "hover:border-emerald-500/20",
  },
  destructive: {
    icon: "text-rose-500 bg-rose-500/10",
    gradient: "from-rose-500/5 via-transparent to-transparent",
    border: "hover:border-rose-500/20",
  },
  primary: {
    icon: "text-violet-500 bg-violet-500/10",
    gradient: "from-violet-500/5 via-transparent to-transparent",
    border: "hover:border-violet-500/20",
  },
  default: {
    icon: "text-foreground bg-muted",
    gradient: "from-muted/30 via-transparent to-transparent",
    border: "hover:border-foreground/10",
  },
};

function getChangeInfo(current: number, previous: number | undefined) {
  if (previous === undefined || previous === 0) return null;
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  if (Math.abs(pct) < 0.5) return null;
  return { pct: Math.round(pct), isUp: pct > 0 };
}

export function MetricCard({
  title,
  value,
  previousValue,
  currency,
  icon: Icon,
  trend,
  color = "default",
  subtitle,
}: MetricCardProps) {
  const config = colorConfig[color];
  const change = getChangeInfo(value, previousValue);
  
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 150, damping: 15 });
  const mouseYSpring = useSpring(y, { stiffness: 150, damping: 15 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["5deg", "-5deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-5deg", "5deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
      }}
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border/50 bg-card p-4 sm:p-5 cursor-default transition-colors duration-300",
        config.border
      )}
    >
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-60", config.gradient)} style={{ transform: "translateZ(0px)" }} />
      <div className="relative z-10" style={{ transform: "translateZ(20px)" }}>
        <div className="flex items-start justify-between mb-3">
          <div className="min-w-0">
            <span className="text-xs sm:text-sm font-medium text-muted-foreground">{title}</span>
            {subtitle && (
              <p className="text-[10px] text-muted-foreground/80 mt-0.5">{subtitle}</p>
            )}
          </div>
          <div className={cn("w-9 h-9 shrink-0 rounded-xl flex items-center justify-center", config.icon)}>
            <Icon className="w-[18px] h-[18px]" />
          </div>
        </div>
        <div className="text-xl sm:text-2xl font-bold tabular-nums tracking-tight">
          <NumberTicker
            value={value}
            currency={currency}
          />
        </div>
        <div className="mt-2 flex items-center gap-1.5" style={{ transform: "translateZ(10px)" }}>
          {change ? (
            <>
              <div className={cn(
                "flex items-center gap-0.5 text-[11px] font-semibold tabular-nums px-1.5 py-0.5 rounded-md",
                change.isUp
                  ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                  : "text-rose-600 dark:text-rose-400 bg-rose-500/10"
              )}>
                {change.isUp
                  ? <TrendingUp className="w-3 h-3" />
                  : <TrendingDown className="w-3 h-3" />
                }
                {change.isUp ? "+" : ""}{change.pct}%
              </div>
              <span className="text-[10px] text-muted-foreground">vs mes anterior</span>
            </>
          ) : (
            <>
              <div
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  trend === "positive" ? "bg-emerald-500" : trend === "negative" ? "bg-rose-500" : "bg-muted-foreground"
                )}
              />
              <span
                className={cn(
                  "text-[11px] font-medium",
                  trend === "positive" ? "text-emerald-500" : trend === "negative" ? "text-rose-500" : "text-muted-foreground"
                )}
              >
                este mes
              </span>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
