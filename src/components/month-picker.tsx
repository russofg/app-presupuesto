"use client";

import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { formatMonth } from "@/lib/format";
import { cn } from "@/lib/utils";

interface MonthPickerProps {
  month: number;
  year: number;
  onChange: (month: number, year: number) => void;
  allowFuture?: boolean;
}

export function MonthPicker({ month, year, onChange, allowFuture = true }: MonthPickerProps) {
  const now = new Date();
  const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear();
  const isFuture = year > now.getFullYear() || (year === now.getFullYear() && month > now.getMonth() + 1);

  const canGoNext = allowFuture || !isCurrentMonth;

  const goPrev = () => {
    if (month === 1) onChange(12, year - 1);
    else onChange(month - 1, year);
  };

  const goNext = () => {
    if (!canGoNext) return;
    if (month === 12) onChange(1, year + 1);
    else onChange(month + 1, year);
  };

  const goToday = () => {
    onChange(now.getMonth() + 1, now.getFullYear());
  };

  return (
    <div className="flex items-center justify-between bg-card border border-border/50 rounded-xl px-1 py-1.5">
      <button
        onClick={goPrev}
        className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl hover:bg-muted active:scale-95 transition-all"
        aria-label="Mes anterior"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <button
        onClick={goToday}
        className="flex-1 min-h-[44px] flex items-center justify-center text-center group"
      >
        <AnimatePresence mode="wait">
          <motion.span
            key={`${month}-${year}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "flex items-center justify-center gap-1.5 text-sm font-semibold capitalize",
              isFuture && "text-primary"
            )}
          >
            <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
            {formatMonth(month, year)}
          </motion.span>
        </AnimatePresence>
        {!isCurrentMonth && (
          <span className="text-[10px] text-primary font-medium group-hover:underline">
            Ir a hoy
          </span>
        )}
      </button>

      <button
        onClick={goNext}
        disabled={!canGoNext}
        className={cn(
          "min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl transition-all",
          !canGoNext
            ? "opacity-30 cursor-not-allowed"
            : "hover:bg-muted active:scale-95"
        )}
        aria-label="Mes siguiente"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
}
