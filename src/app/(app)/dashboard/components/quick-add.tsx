"use client";

// Imports
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useCreateTransaction } from "@/hooks/use-transactions";
import { useCategories } from "@/hooks/use-categories";
import { useUISounds } from "@/hooks/use-ui-sounds";
import { formatCurrency } from "@/lib/format";
import { CategoryIcon } from "@/components/category-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Zap, X, Check, Loader2 } from "lucide-react";
import type { Transaction, Currency } from "@/types";
import { cn } from "@/lib/utils";

interface QuickAddProps {
  transactions: Transaction[];
  currency: Currency;
}

interface QuickTemplate {
  description: string;
  amount: number;
  type: "income" | "expense";
  categoryId: string;
  count: number;
}

export function QuickAdd({ transactions, currency }: QuickAddProps) {
  const { data: categories } = useCategories();
  const createMutation = useCreateTransaction();
  const { playPop, playSuccess } = useUISounds();
  const [activeTemplate, setActiveTemplate] = useState<QuickTemplate | null>(null);
  const [customAmount, setCustomAmount] = useState("");

  const templates = useMemo(() => {
    if (!transactions || transactions.length < 3) return [];
    const freq: Record<string, QuickTemplate> = {};
    transactions.forEach((t) => {
      const key = `${t.description.toLowerCase().trim()}|${t.categoryId}|${t.type}`;
      if (!freq[key]) {
        freq[key] = {
          description: t.description,
          amount: t.amount,
          type: t.type,
          categoryId: t.categoryId,
          count: 0,
        };
      }
      freq[key].count++;
      freq[key].amount = t.amount;
    });
    return Object.values(freq)
      .filter((t) => t.count >= 2)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [transactions]);

  const handleQuickAdd = async (template: QuickTemplate, amount?: number) => {
    await createMutation.mutateAsync({
      type: template.type,
      amount: amount || template.amount,
      description: template.description,
      categoryId: template.categoryId,
      date: new Date(),
      tags: [],
      isRecurring: false,
      notes: "",
    });
    playSuccess();
    setActiveTemplate(null);
    setCustomAmount("");
  };

  if (templates.length === 0) return null;

  const getCat = (id: string) => categories?.find((c) => c.id === id);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <Zap className="w-4 h-4 text-amber-500" />
        Agregar rápido
      </h3>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {templates.map((t) => {
          const cat = getCat(t.categoryId);
          const isActive = activeTemplate?.description === t.description && activeTemplate?.categoryId === t.categoryId;

          return (
            <motion.button
              key={`${t.description}|${t.categoryId}`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                playPop();
                if (isActive) {
                  setActiveTemplate(null);
                } else {
                  setActiveTemplate(t);
                  setCustomAmount(String(t.amount));
                }
              }}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-xl border text-left shrink-0 transition-all duration-200",
                isActive
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border/50 bg-card hover:border-border hover:bg-muted/30"
              )}
            >
              {cat && <CategoryIcon icon={cat.icon} color={cat.color} size="sm" />}
              <div className="min-w-0">
                <p className="text-xs font-medium truncate max-w-[100px]">{t.description}</p>
                <p className={cn(
                  "text-[10px] font-medium tabular-nums",
                  t.type === "income" ? "text-emerald-500" : "text-muted-foreground"
                )}>
                  {formatCurrency(t.amount, currency)}
                </p>
              </div>
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence>
        {activeTemplate && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground mb-1.5">
                  {activeTemplate.description} · Modificá el monto si querés
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.01"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    className="h-9 rounded-lg text-sm w-32 tabular-nums"
                    autoFocus
                  />
                  <Button
                    size="sm"
                    className="rounded-lg h-9 px-3 gap-1.5"
                    disabled={createMutation.isPending || !customAmount || Number(customAmount) <= 0}
                    onClick={() => handleQuickAdd(activeTemplate, Number(customAmount))}
                  >
                    {createMutation.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    Agregar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="rounded-lg h-9 w-9 p-0"
                    onClick={() => setActiveTemplate(null)}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
