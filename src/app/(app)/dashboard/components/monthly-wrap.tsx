"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { formatCurrency } from "@/lib/format";
import { CategoryIcon } from "@/components/category-icon";
import { LevelBadge } from "@/components/level-badge";
import { useUISounds } from "@/hooks/use-ui-sounds";
import { X, Sparkles, TrendingUp, TrendingDown, PiggyBank, Award, BarChart3, Trophy } from "lucide-react";
import type { Transaction, Category, Currency } from "@/types";
import { cn } from "@/lib/utils";

interface MonthlyWrapProps {
  open: boolean;
  onClose: () => void;
  month: number;
  year: number;
  transactions: Transaction[];
  prevTransactions: Transaction[];
  categories: Category[];
  currency: Currency;
  healthScore: number;
  level: { name: string; icon: string; progress: number; xpToNext: number; color: string; };
}

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir < 0 ? 300 : -300, opacity: 0 }),
};

interface SlideProps {
  children: React.ReactNode;
  bg: string;
}

function Slide({ children, bg }: SlideProps) {
  return (
    <div className={cn("h-full flex flex-col items-center justify-center p-8 text-center", bg)}>
      {children}
    </div>
  );
}

const STORY_DURATION = 5000;

export function MonthlyWrap({
  open,
  onClose,
  month,
  year,
  transactions,
  prevTransactions,
  categories,
  currency,
  healthScore,
  level,
}: MonthlyWrapProps) {
  const [page, setPage] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  
  const { playPop, playSuccess } = useUISounds();

  const income = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expenses = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const prevIncome = prevTransactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const prevExpenses = prevTransactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const balance = income - expenses;

  const byCategory: Record<string, number> = {};
  transactions.filter((t) => t.type === "expense").forEach((t) => {
    byCategory[t.categoryId] = (byCategory[t.categoryId] || 0) + t.amount;
  });
  const topCats = Object.entries(byCategory)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([id, amount]) => ({ category: categories.find((c) => c.id === id), amount }));

  const txCount = transactions.length;
  const avgPerDay = expenses > 0 ? expenses / new Date(year, month, 0).getDate() : 0;
  const incomeChange = prevIncome > 0 ? ((income - prevIncome) / prevIncome) * 100 : 0;
  const expenseChange = prevExpenses > 0 ? ((expenses - prevExpenses) / prevExpenses) * 100 : 0;

  const biggestExpense = transactions
    .filter((t) => t.type === "expense")
    .sort((a, b) => b.amount - a.amount)[0];
  const biggestCat = biggestExpense && categories ? categories.find((c) => c.id === biggestExpense.categoryId) : null;

  const getScoreEmoji = (s: number) => s >= 80 ? "🏆" : s >= 60 ? "💪" : s >= 40 ? "📈" : "🎯";
  const getScoreMsg = (s: number) => {
    if (s >= 80) return "¡Excelente! Tus finanzas están impecables.";
    if (s >= 60) return "¡Muy bien! Vas por buen camino.";
    if (s >= 40) return "Hay margen para mejorar. ¡Vos podés!";
    return "Este mes fue difícil, pero cada día es una nueva oportunidad.";
  };

  const slides = [
    // Slide 0: Intro
    <Slide key="intro" bg="bg-gradient-to-br from-violet-600 to-indigo-700">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }}>
        <Sparkles className="w-16 h-16 text-white/80 mx-auto mb-6" />
      </motion.div>
      <motion.h2 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }} className="text-3xl font-bold text-white mb-2">
        Tu resumen de
      </motion.h2>
      <motion.h1 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6 }} className="text-5xl font-black text-white">
        {MONTH_NAMES[month - 1]}
      </motion.h1>
      <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.8 }} className="text-white/60 mt-4 text-sm">
        {year} · {txCount} movimiento{txCount !== 1 ? "s" : ""}
      </motion.p>
    </Slide>,

    // Slide 1: Income & Expenses
    <Slide key="money" bg="bg-gradient-to-br from-emerald-600 to-teal-700">
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
        <TrendingUp className="w-12 h-12 text-white/80 mx-auto mb-6" />
        <p className="text-white/60 text-sm mb-1">Ingresaste</p>
        <p className="text-4xl font-black text-white mb-6">{formatCurrency(income, currency)}</p>
      </motion.div>
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}>
        <TrendingDown className="w-12 h-12 text-white/80 mx-auto mb-4" />
        <p className="text-white/60 text-sm mb-1">Gastaste</p>
        <p className="text-4xl font-black text-white">{formatCurrency(expenses, currency)}</p>
      </motion.div>
      {prevTransactions.length > 0 && (
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.8 }} className="mt-6 flex gap-4">
          {incomeChange !== 0 && (
            <span className={cn("text-xs font-medium px-2 py-1 rounded-full", incomeChange > 0 ? "bg-white/20 text-white" : "bg-red-500/30 text-red-200")}>
              Ingresos {incomeChange > 0 ? "+" : ""}{Math.round(incomeChange)}%
            </span>
          )}
          {expenseChange !== 0 && (
            <span className={cn("text-xs font-medium px-2 py-1 rounded-full", expenseChange < 0 ? "bg-white/20 text-white" : "bg-red-500/30 text-red-200")}>
              Gastos {expenseChange > 0 ? "+" : ""}{Math.round(expenseChange)}%
            </span>
          )}
        </motion.div>
      )}
    </Slide>,

    // Slide 2: Top Categories
    <Slide key="categories" bg="bg-gradient-to-br from-amber-600 to-orange-700">
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
        <BarChart3 className="w-12 h-12 text-white/80 mx-auto mb-4" />
        <p className="text-white/70 text-sm mb-6">En lo que más gastaste</p>
      </motion.div>
      <div className="space-y-4 w-full max-w-xs">
        {topCats.map((item, i) => (
          <motion.div key={item.category?.id ?? i} initial={{ x: -40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.4 + i * 0.2 }} className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3">
            <span className="text-2xl font-black text-white/40 w-8">{i + 1}</span>
            {item.category && <CategoryIcon icon={item.category.icon} color={item.category.color} size="sm" />}
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-semibold text-white truncate">{item.category?.name ?? "Sin categoría"}</p>
              <p className="text-xs text-white/50">{expenses > 0 ? Math.round((item.amount / expenses) * 100) : 0}% del total</p>
            </div>
            <p className="text-sm font-bold text-white tabular-nums">{formatCurrency(item.amount, currency)}</p>
          </motion.div>
        ))}
      </div>
    </Slide>,

    // Slide 3: Balance & Savings
    <Slide key="balance" bg={balance >= 0 ? "bg-gradient-to-br from-sky-600 to-blue-700" : "bg-gradient-to-br from-rose-600 to-red-700"}>
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.3 }}>
        <PiggyBank className="w-16 h-16 text-white/80 mx-auto mb-6" />
      </motion.div>
      <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }} className="text-white/60 text-sm mb-2">
        {balance >= 0 ? "Ahorraste" : "Tu déficit fue de"}
      </motion.p>
      <motion.p initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", delay: 0.7 }} className="text-5xl font-black text-white">
        {formatCurrency(Math.abs(balance), currency)}
      </motion.p>
      <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 1 }} className="text-white/50 text-xs mt-4">
        Promedio diario de gasto: {formatCurrency(avgPerDay, currency)}
      </motion.p>
    </Slide>,

    // Slide 4: Gamification Level & Score
    <Slide key="gamification" bg="bg-gradient-to-br from-fuchsia-600 to-purple-800">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.3 }}>
        <Trophy className="w-16 h-16 text-white/80 mx-auto mb-6" />
      </motion.div>
      <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }} className="text-white/80 font-medium mb-6">
        Estás alcanzando nuevas metas
      </motion.p>
      
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.7 }} className="bg-white p-4 rounded-2xl mx-auto w-full max-w-xs shadow-xl">
        <LevelBadge 
          name={level.name}
          icon={level.icon}
          progress={level.progress}
          xpToNext={level.xpToNext}
          color={level.color}
        />
      </motion.div>
      
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.9 }} className="mt-8">
         <p className="text-5xl mb-2">{getScoreEmoji(healthScore)}</p>
         <p className="text-white font-bold text-xl">Salud: {healthScore}/100</p>
         <p className="text-white/70 text-sm max-w-xs mt-1">{getScoreMsg(healthScore)}</p>
      </motion.div>
    </Slide>
  ];

  const totalSlides = slides.length;

  const paginate = useCallback((newDirection: number) => {
    const next = page + newDirection;
    if (next < 0) {
      if (page > 0) {
        setDirection(newDirection);
        setPage(0);
      }
      return;
    }
    if (next >= totalSlides) {
      onClose();
      return;
    }
    setDirection(newDirection);
    setPage(next);
    playPop();
  }, [page, totalSlides, onClose, playPop]);

  useEffect(() => {
    if (open) {
      setPage(0);
      setDirection(0);
      setIsPaused(false);
      playSuccess();
    }
  }, [open, playSuccess]);

  useEffect(() => {
    if (!open || isPaused) return;
    const timer = setTimeout(() => {
      paginate(1);
    }, STORY_DURATION);
    return () => clearTimeout(timer);
  }, [page, open, isPaused, paginate]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           exit={{ opacity: 0 }}
           className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md"
        >
          {/* Main Container */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-[400px] h-[100dvh] sm:h-[80vh] sm:max-h-[750px] sm:rounded-3xl overflow-hidden shadow-2xl bg-black"
          >
            {/* Context/Stories Progress Bars */}
            <div className="absolute top-4 left-4 right-4 flex gap-1.5 z-50">
               {slides.map((_, i) => (
                 <div key={i} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-white rounded-full"
                      initial={{ width: i < page ? "100%" : "0%" }}
                      animate={{ 
                        width: i === page && !isPaused ? "100%" : i < page ? "100%" : "0%"
                      }}
                      transition={{ 
                         duration: i === page ? STORY_DURATION / 1000 : 0, 
                         ease: "linear" 
                      }}
                    />
                 </div>
               ))}
            </div>

            <button
               onClick={onClose}
               className="absolute top-8 right-4 z-50 w-8 h-8 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white/90 hover:text-white transition-colors"
            >
               <X className="w-5 h-5" />
            </button>

            {/* Slides Area */}
            <AnimatePresence initial={false} custom={direction}>
               <motion.div
                 key={page}
                 custom={direction}
                 variants={slideVariants}
                 initial="enter"
                 animate="center"
                 exit="exit"
                 transition={{ type: "spring", stiffness: 300, damping: 30 }}
                 className="absolute inset-0 z-10"
               >
                 {slides[page]}
               </motion.div>
            </AnimatePresence>

            {/* Tap Controls */}
            <div 
               className="absolute inset-y-0 left-0 w-1/3 z-40" 
               onClick={() => paginate(-1)}
               onPointerDown={() => setIsPaused(true)}
               onPointerUp={() => setIsPaused(false)}
               onPointerLeave={() => setIsPaused(false)}
            />
            <div 
               className="absolute inset-y-0 right-0 w-2/3 z-40" 
               onClick={() => paginate(1)}
               onPointerDown={() => setIsPaused(true)}
               onPointerUp={() => setIsPaused(false)}
               onPointerLeave={() => setIsPaused(false)}
            />

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

