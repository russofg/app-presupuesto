"use client";

import { motion } from "motion/react";
import { staggerContainer, fadeInUp } from "@/lib/motion";
import { PageHeader } from "@/components/layout/page-header";
import { DollarConverter } from "@/components/dollar-converter";

export default function DolarPage() {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-2xl mx-auto"
    >
      <PageHeader
        title="Cotización del dólar"
        description="Consultá el precio oficial y MEP en tiempo real. Convertí pesos a dólares."
      />

      <motion.div variants={fadeInUp}>
        <DollarConverter />
      </motion.div>
    </motion.div>
  );
}
