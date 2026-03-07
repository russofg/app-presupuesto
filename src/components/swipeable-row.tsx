"use client";

import { useState } from "react";
import { motion, useMotionValue, animate, PanInfo } from "motion/react";
import { Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const SWIPE_THRESHOLD = 60;
const ACTION_WIDTH = 120;

interface SwipeableRowProps {
  children: React.ReactNode;
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
  disabled?: boolean;
}

export function SwipeableRow({
  children,
  onEdit,
  onDelete,
  className,
  disabled = false,
}: SwipeableRowProps) {
  const x = useMotionValue(0);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const offset = info.offset.x;
    const velocity = info.velocity.x;

    if (offset < -SWIPE_THRESHOLD || velocity < -300) {
      animate(x, -ACTION_WIDTH, { type: "spring", stiffness: 400, damping: 30 });
    } else {
      animate(x, 0, { type: "spring", stiffness: 400, damping: 30 });
    }
    setIsDragging(false);
  };

  if (disabled || (!onEdit && !onDelete)) {
    return <div className={cn("touch-pan-y", className)}>{children}</div>;
  }

  return (
    <div className={cn("relative overflow-hidden rounded-xl touch-pan-y", className)}>
      {/* Actions background - swipe left to reveal */}
      <div className="absolute inset-y-0 right-0 flex">
        {onEdit && (
          <button
            type="button"
            onClick={() => {
              animate(x, 0, { type: "spring", stiffness: 400, damping: 30 });
              onEdit();
            }}
            className="flex items-center justify-center w-[60px] bg-primary/20 text-primary shrink-0 active:bg-primary/30 min-h-[44px]"
            aria-label="Editar"
          >
            <Pencil className="w-4 h-4" />
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            onClick={() => {
              animate(x, 0, { type: "spring", stiffness: 400, damping: 30 });
              onDelete();
            }}
            className="flex items-center justify-center w-[60px] bg-destructive/20 text-destructive shrink-0 active:bg-destructive/30 min-h-[44px]"
            aria-label="Eliminar"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Sliding content */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -ACTION_WIDTH, right: 0 }}
        dragElastic={0.15}
        dragDirectionLock
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className="relative z-10 bg-card touch-pan-y select-none"
      >
        {children}
      </motion.div>
    </div>
  );
}
