"use client";

import { motion } from "motion/react";
import { Sparkles } from "lucide-react";
import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-primary/10 via-background to-chart-5/10 items-center justify-center p-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,var(--primary)_0%,transparent_50%)] opacity-[0.07]" />
        <div className="relative z-10 max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mb-8">
              <Sparkles className="w-7 h-7 text-primary-foreground" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight mb-4">
              Tu plata,
              <br />
              <span className="gradient-text">organizada como nunca.</span>
            </h1>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Controlá tus gastos, gestioná presupuestos y alcanzá tus metas financieras con una experiencia premium diseñada para el uso diario.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="mt-12 grid grid-cols-3 gap-4"
          >
            {[
              { label: "Encriptado", value: "256-bit" },
              { label: "Categorías", value: "14+" },
              { label: "Sincronización", value: "En vivo" },
            ].map((stat) => (
              <div key={stat.label} className="glass rounded-xl p-4 text-center">
                <div className="text-lg font-bold">{stat.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mt-8 flex items-center gap-3"
          >
            <div className="flex -space-x-2">
              {["#10b981", "#3b82f6", "#8b5cf6", "#f97316"].map((color) => (
                <div
                  key={color}
                  className="w-8 h-8 rounded-full border-2 border-background"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              Gestioná tus finanzas como un pro
            </p>
          </motion.div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="w-full max-w-[400px]"
        >
          <div className="lg:hidden flex items-center gap-2.5 mb-10">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight">Financia</span>
          </div>
          {children}
        </motion.div>
      </div>
    </div>
  );
}
