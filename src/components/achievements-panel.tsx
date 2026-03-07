"use client";

import { motion, AnimatePresence } from "motion/react";
import { type Achievement } from "@/lib/gamification";
import { cn } from "@/lib/utils";
import { Trophy, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AchievementsPanelProps {
  achievements: Achievement[];
  open: boolean;
  onClose: () => void;
}

const categoryLabels: Record<string, string> = {
  tracking: "Registro",
  savings: "Ahorro",
  goals: "Metas",
  streak: "Racha",
  level: "Nivel",
};

export function AchievementsPanel({ achievements, open, onClose }: AchievementsPanelProps) {
  const unlocked = achievements.filter((a) => a.unlocked);
  const locked = achievements.filter((a) => !a.unlocked);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-background border-l border-border/50 z-50 overflow-y-auto"
          >
            <div className="p-5 sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">Logros</h2>
                    <p className="text-xs text-muted-foreground">
                      {unlocked.length}/{achievements.length} desbloqueados
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose} className="rounded-xl">
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-8">
                <motion.div
                  className="h-full rounded-full bg-amber-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${(unlocked.length / achievements.length) * 100}%` }}
                  transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
                />
              </div>

              {unlocked.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Desbloqueados
                  </h3>
                  <div className="grid grid-cols-1 gap-2">
                    {unlocked.map((a, i) => (
                      <motion.div
                        key={a.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50"
                      >
                        <span className="text-2xl">{a.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold">{a.name}</p>
                          <p className="text-xs text-muted-foreground">{a.description}</p>
                        </div>
                        <span className="text-[10px] font-medium text-muted-foreground px-2 py-0.5 rounded-full bg-muted">
                          {categoryLabels[a.category]}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {locked.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Por desbloquear
                  </h3>
                  <div className="grid grid-cols-1 gap-2">
                    {locked.map((a) => (
                      <div
                        key={a.id}
                        className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/30 opacity-60"
                      >
                        <span className="text-2xl grayscale">🔒</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold">{a.name}</p>
                          <p className="text-xs text-muted-foreground">{a.description}</p>
                        </div>
                        <span className="text-[10px] font-medium text-muted-foreground px-2 py-0.5 rounded-full bg-muted">
                          {categoryLabels[a.category]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
