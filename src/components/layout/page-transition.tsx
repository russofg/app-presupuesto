"use client";

import { motion, AnimatePresence } from "motion/react";
import { usePathname } from "next/navigation";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -15 }}
        transition={{
          type: "spring",
          stiffness: 260,
          damping: 20,
        }}
        className="flex-1 w-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
