"use client";

import { motion } from "motion/react";
import { Lightbulb } from "lucide-react";
import type { Insight } from "@/lib/insights";
import { cn } from "@/lib/utils";

interface InsightsCardProps {
  insights: Insight[];
}

const typeBg: Record<Insight["type"], string> = {
  positive: "bg-emerald-500/10 border-emerald-500/20",
  negative: "bg-rose-500/10 border-rose-500/20",
  neutral: "bg-sky-500/10 border-sky-500/20",
  tip: "bg-amber-500/10 border-amber-500/20",
};

const typeText: Record<Insight["type"], string> = {
  positive: "text-emerald-700 dark:text-emerald-300",
  negative: "text-rose-700 dark:text-rose-300",
  neutral: "text-sky-700 dark:text-sky-300",
  tip: "text-amber-700 dark:text-amber-300",
};

export function InsightsCard({ insights }: InsightsCardProps) {
  if (insights.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-5 space-y-4">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <Lightbulb className="w-4 h-4 text-amber-500" />
        Insights inteligentes
      </h3>

      <div className="space-y-2.5">
        {insights.map((insight, i) => (
          <motion.div
            key={insight.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className={cn(
              "flex items-start gap-3 rounded-xl border p-3 transition-colors",
              typeBg[insight.type]
            )}
          >
            <span className="text-lg shrink-0 mt-0.5">{insight.icon}</span>
            <div className="min-w-0 flex-1">
              <p className={cn("text-xs font-semibold", typeText[insight.type])}>
                {insight.title}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                {insight.description}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
