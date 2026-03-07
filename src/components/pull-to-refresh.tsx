"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface PullToRefreshProps {
  onRefresh: () => Promise<unknown>;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

const THRESHOLD = 80;
const MAX_PULL = 120;

export function PullToRefresh({ onRefresh, children, className, disabled }: PullToRefreshProps) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [startY, setStartY] = useState(0);
  const [canPull, setCanPull] = useState(false);

  const checkCanPull = useCallback(() => {
    if (typeof window === "undefined") return false;
    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
    return scrollTop <= 5;
  }, []);

  useEffect(() => {
    const handleScroll = () => setCanPull(checkCanPull());
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [checkCanPull]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled) return;
    if (checkCanPull()) {
      setStartY(e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (disabled || refreshing) return;
    if (!checkCanPull()) {
      setPull(0);
      return;
    }
    const y = e.touches[0].clientY;
    const diff = y - startY;
    if (diff > 0) {
      e.preventDefault();
      const resistance = 0.5;
      setPull(Math.min(diff * resistance, MAX_PULL));
    } else {
      setPull(0);
    }
  };

  const handleTouchEnd = async () => {
    if (refreshing) return;
    if (pull >= THRESHOLD) {
      setRefreshing(true);
      setPull(0);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
      }
    } else {
      setPull(0);
    }
  };

  return (
    <div
      className={cn("relative", className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <AnimatePresence>
        {(pull > 0 || refreshing) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute left-1/2 -translate-x-1/2 z-20 flex flex-col items-center justify-center pointer-events-none"
            style={{
              top: Math.min(pull, MAX_PULL) / 2 - 24,
            }}
          >
            <motion.div
              animate={{
                rotate: refreshing ? 360 : pull >= THRESHOLD ? 180 : 0,
              }}
              transition={refreshing ? { repeat: Infinity, duration: 1, ease: "linear" } : { type: "spring", stiffness: 300 }}
              className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center"
            >
              <RefreshCw className="w-5 h-5 text-primary" />
            </motion.div>
            <span className="text-[10px] text-muted-foreground mt-1">
              {refreshing ? "Actualizando..." : pull >= THRESHOLD ? "Soltá para actualizar" : "Deslizá hacia abajo"}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
      {children}
    </div>
  );
}
