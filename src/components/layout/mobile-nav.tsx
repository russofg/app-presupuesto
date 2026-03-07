"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  LayoutDashboard,
  ArrowLeftRight,
  PiggyBank,
  Target,
  MoreHorizontal,
  Settings,
  Tags,
  BarChart3,
  CalendarDays,
  CreditCard,
  DollarSign,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const mainItems = [
  { href: "/dashboard", label: "Inicio", icon: LayoutDashboard },
  { href: "/transactions", label: "Movimientos", icon: ArrowLeftRight },
  { href: "/budgets", label: "Presupuestos", icon: PiggyBank },
  { href: "/goals", label: "Metas", icon: Target },
];

const moreItems = [
  { href: "/calendar", label: "Calendario", icon: CalendarDays },
  { href: "/subscriptions", label: "Suscripciones", icon: CreditCard },
  { href: "/dolar", label: "Dólar", icon: DollarSign },
  { href: "/reports", label: "Reportes", icon: BarChart3 },
  { href: "/categories", label: "Categorías", icon: Tags },
  { href: "/settings", label: "Ajustes", icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const isMoreActive = moreItems.some(
    (item) => pathname === item.href || pathname.startsWith(item.href + "/")
  );

  return (
    <>
      {/* More menu overlay */}
      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
              onClick={() => setMoreOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 80 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 80 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="fixed bottom-[72px] right-3 z-50 w-48 rounded-2xl border border-border/50 bg-card shadow-2xl overflow-hidden"
            >
              {moreItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3.5 text-sm font-medium transition-colors active:bg-muted/50",
                      isActive ? "text-primary bg-primary/5" : "text-foreground"
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                );
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 glass-strong border-t border-border/30">
        <div className="flex items-center justify-around px-1 py-2 safe-area-bottom">
          {mainItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMoreOpen(false)}
                className={cn(
                  "relative flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-colors min-w-[56px]",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="mobile-nav-active"
                    className="absolute -top-1 w-5 h-0.5 bg-primary rounded-full"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <item.icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}

          {/* More button */}
          <button
            onClick={() => setMoreOpen(!moreOpen)}
            className={cn(
              "relative flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-colors min-w-[56px]",
              moreOpen || isMoreActive ? "text-primary" : "text-muted-foreground"
            )}
          >
            {(isMoreActive && !moreOpen) && (
              <motion.div
                layoutId="mobile-nav-active"
                className="absolute -top-1 w-5 h-0.5 bg-primary rounded-full"
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
              />
            )}
            {moreOpen ? <X className="w-5 h-5" /> : <MoreHorizontal className="w-5 h-5" />}
            <span className="text-[10px] font-medium">Más</span>
          </button>
        </div>
      </nav>
    </>
  );
}
