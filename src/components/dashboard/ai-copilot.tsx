"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles } from "lucide-react";

interface AiCopilotProps {
  totalIncome: number;
  totalExpenses: number;
  username: string;
}

export function AiCopilot({ totalIncome, totalExpenses, username }: AiCopilotProps) {
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Para no gastar cuotas al navegar constantemente, 
    // hacemos que solo pida cuando hay datos significativos, 
    // y damos un delay para no bloquear la renderización inicial.
    async function fetchInsight() {
      try {
        const response = await fetch("/api/insights", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ totalIncome, totalExpenses, username }),
        });
        const data = await response.json();
        if (data.insight) {
          // Remover asteriscos o formato Markdown básico que a veces devuelve el modelo
          const cleanText = data.insight.replace(/[\*\_]/g, "");
          setInsight(cleanText);
        }
      } catch (error) {
        console.error("AI Copilot request failed", error);
      } finally {
        setLoading(false);
      }
    }

    const timer = setTimeout(() => {
      fetchInsight();
    }, 1500);

    return () => clearTimeout(timer);
  }, [totalIncome, totalExpenses, username]);

  if (!loading && !insight) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-white/10 dark:border-white/5 bg-gradient-to-r from-violet-500/5 via-fuchsia-500/5 to-emerald-500/5 p-4 sm:p-5 backdrop-blur-md shadow-sm"
    >
      <div className="absolute inset-0 bg-noise opacity-20 pointer-events-none" />
      <div className="absolute -inset-[100%] animate-[spin_12s_linear_infinite] opacity-20 bg-[conic-gradient(from_90deg_at_50%_50%,rgba(192,132,252,0.3)_0%,rgba(52,211,153,0.3)_50%,rgba(192,132,252,0.3)_100%)] blur-2xl z-0 pointer-events-none" />
      
      <div className="relative z-10 flex items-start gap-4">
        <div className="p-2 sm:p-2.5 rounded-xl bg-background/60 border border-white/10 shrink-0 shadow-inner">
          <Sparkles className="w-5 h-5 text-violet-500 dark:text-violet-400 animate-pulse" />
        </div>
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold tracking-widest uppercase text-violet-600 dark:text-violet-300">
              Copiloto Financiero
            </h3>
            {loading && (
              <span className="flex gap-1">
                <span className="w-1 h-1 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1 h-1 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1 h-1 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "300ms" }} />
              </span>
            )}
          </div>
          
          <div className="min-h-[40px] flex items-center">
            <AnimatePresence mode="wait">
              {loading ? (
                <motion.p
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-sm font-medium text-muted-foreground italic h-full py-1"
                >
                  Analizando tu mes para darte un consejo único...
                </motion.p>
              ) : (
                <motion.p
                  key="loaded"
                  initial={{ opacity: 0, filter: "blur(4px)" }}
                  animate={{ opacity: 1, filter: "blur(0px)" }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="text-sm sm:text-base font-medium leading-relaxed text-foreground"
                >
                  {insight}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
