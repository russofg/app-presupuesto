"use client";

import { motion } from "motion/react";
import { Plus } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

export function FloatingActionButton() {
  const pathname = usePathname();
  const router = useRouter();

  const showOnPages = ["/dashboard", "/transactions", "/budgets", "/reports"];
  const shouldShow = showOnPages.some((p) => pathname === p || pathname.startsWith(p + "/"));

  if (!shouldShow) return null;

  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.3 }}
      whileTap={{ scale: 0.9 }}
      onClick={() => router.push("/transactions?new=1")}
      className="lg:hidden fixed right-4 bottom-20 z-40 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 flex items-center justify-center active:shadow-md transition-shadow"
      aria-label="Nuevo movimiento"
    >
      <Plus className="w-6 h-6" />
    </motion.button>
  );
}
